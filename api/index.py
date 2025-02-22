from flask import Flask, jsonify, request
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import logging

env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, service_role_key)

@app.route("/api/units", methods=["GET"])
def get_units():
    units = supabase.from_("units").select("*").execute()
    logging.info(units)
    units_data = units.data
    return jsonify({"units": units_data}), 200
