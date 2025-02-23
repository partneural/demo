from flask import Flask, jsonify, request, send_file
import logging
import os
import openai
import time

from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from io import BytesIO
from pydub import AudioSegment
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import logging
import io
from twilio.rest import Client as TwilioClient
from elevenlabs.client import ElevenLabs
from elevenlabs import play
from pyngrok import ngrok
import uuid
from zoneinfo import ZoneInfo

env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, service_role_key)

twilio_client = TwilioClient(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

client = ElevenLabs()

# Remove the ngrok initialization and just use an environment variable
ngrok_url = os.getenv("NGROK_URL")
if not ngrok_url:
    print("Warning: NGROK_URL environment variable is not set!")

# In-memory storage for audio files
audio_storage = {}

def generate_unique_id():
    return str(uuid.uuid4())

# TODO: Figure out a better way to split out files. Maybe we can add silence detection? I.e. once a chunk has hit a defined minimum length, keep going until we get a period of silence that's a certain length and cut it off there?
def split_audio(file_path, chunk_length_ms=5123): # chunk length defined in milliseconds, using an irregular value to reduce chance of getting chunks that are too short due to the audio lengths used in testing
    audio = AudioSegment.from_mp3(file_path)
    chunks = []

    for start_ms in range(0, len(audio), chunk_length_ms):
        chunk = audio[start_ms:start_ms+chunk_length_ms]
        chunks.append(chunk)
    return chunks

def transcribe_audio(file_path, name):
    chunks = split_audio(file_path)
    transcription = ""

    # TODO: Implement conversations -- either figure out a way to separate distinct chunks of conversation (pydub can probably do this) or just pick an arbitrary/random number of chunks and assign a new conversation ID once that many chunks have been processed

    for chunk in chunks:
        with BytesIO() as chunk_io:
            chunk.export(chunk_io, format='mp3')
            chunk_io.seek(0)

            chunk_io.name = 'chunk.mp3' # any file name is fine as long as it has the mp3 extension since it appears that Whisper identifies file type through the extension

            response = openai.audio.transcriptions.create(
                file=chunk_io,
                model='whisper-1',
                response_format='text',
            )

            transcription += response + " "

            timestamp = datetime.now(ZoneInfo('US/Eastern'))
            timestamp_str = timestamp.isoformat() # convert to ISO 8601 formatted string for compatability

            # query to get the id of a unit since we need it in the transcriptions table to tie a transcription back to a unit
            db_response = (
                supabase.table('units')
                .select('id')
                .eq('name', name)
                .execute()
            )

            # insert each transcribed chunk into the db
            if db_response.data:
                response_id = db_response.data[0]['id']

                db_response = (
                    supabase.table('transcriptions')
                    .insert({
                        'created_at': timestamp_str,
                        'user': name, # TODO: Perform speaker diarization instead of hardcoding a name
                        'message': response,
                        'unit_id': response_id,
                    })
                    .execute()
                )
            # if a corresponding uuid can't be found for the given officer, then just use a random uuid as a fallback
            else:
                db_response = (
                    supabase.table('transcriptions')
                    .insert({
                        'created_at': timestamp_str,
                        'user': name, # TODO: Perform speaker diarization instead of hardcoding a name
                        'message': response
                    })
                    .execute()
                )

            time.sleep(5) # artificial delay to simulate incoming streaming data

            # print('Inserted row.')
            # print(f'{timestamp} - {response}')
            # print(transcription)
    return transcription

@app.route("/api/units", methods=["GET"])
def get_units():
    units = supabase.from_("units").select("*").execute()
    logging.info(units)
    return jsonify({"units": units.data}), 200

@app.route("/api/audio/<call_sid>", methods=["GET"])
def serve_audio(call_sid):
    audio_data = audio_storage.get(call_sid)
    if audio_data:
        return send_file(
            io.BytesIO(audio_data),
            mimetype="audio/mpeg"
        )
    return "Audio not found", 404

@app.route("/api/alert", methods=["POST"])
def alert():
    try:
        data = request.json
        if not data or "text" not in data or "phone_number" not in data:
            return jsonify({"error": "Missing required fields"}), 400

        text = data["text"]
        phone_number = data["phone_number"]

        # Generate audio using ElevenLabs
        audio = client.text_to_speech.convert(
            text=text,
            voice_id="JBFqnCBsd6RMkjVDRZzb",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        # Convert generator to bytes
        audio_bytes = b"".join(audio)

        # Store the audio bytes with a unique ID
        call_sid = generate_unique_id()
        audio_storage[call_sid] = audio_bytes

        # Create TwiML that points to our ngrok audio endpoint
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Play>{ngrok_url}/api/audio/{call_sid}</Play>
                </Response>"""

        logging.info(phone_number)
        # Make the call using Twilio
        call = twilio_client.calls.create(
            twiml=twiml,
            to=phone_number,
            from_=os.getenv("TWILIO_PHONE_NUMBER")
        )

        return jsonify({
            "message": "Alert call initiated successfully",
            "call_sid": call.sid,
            "ngrok_url": ngrok_url
        }), 200

    except Exception as e:
        logging.error(f"Error making alert call: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add at the bottom of the file
if __name__ == "__main__":
    app.run(port=5328)


@app.route("/api/simulate", methods=["POST"])
# Insert python script here
@app.route("/api/simulate", methods=["POST"])
def simulate():
    file_path_1 = '../audio_samples/Bodycam 1A.mp3'
    transcription_1 = transcribe_audio(file_path_1, 'Alpha')

    return '', 204