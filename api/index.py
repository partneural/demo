from flask import Flask, jsonify, request, send_file
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

