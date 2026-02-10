import os
import time
import schedule
import requests
from openai import OpenAI
from groq import Groq
from supabase import create_client
from discord_webhook import DiscordWebhook
from googleapiclient.discovery import build
from google.oauth2 import service_account

# ===================== LOAD ENV =====================
AUTO_MODE = os.getenv("AUTO_MODE", "true") == "true"

# AI KEYS
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")

# SUPABASE
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# GOOGLE
GOOGLE_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
SHEET_NAME = os.getenv("GOOGLE_SHEET_NAME")

# DISCORD
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

# ===================== INIT CLIENTS =====================
openai_client = OpenAI(api_key=OPENAI_KEY)
groq_client = Groq(api_key=GROQ_KEY)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Google Sheets
credentials = service_account.Credentials.from_service_account_info(
    eval(GOOGLE_JSON),
    scopes=["https://www.googleapis.com/auth/spreadsheets"]
)
sheets_service = build("sheets", "v4", credentials=credentials)

# ===================== AI CORE =====================
def ai_generate(prompt):
    try:
        # OpenAI Primary
        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800
        )
        return response.choices[0].message.content
    except:
        # Groq fallback (super fast)
        response = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content


# ===================== DATABASE LOG =====================
def log_to_supabase(data):
    supabase.table("nexus_logs").insert({"content": data}).execute()


# ===================== GOOGLE SHEETS LOG =====================
def log_to_sheet(text):
    body = {"values": [[time.ctime(), text]]}
    sheets_service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID,
        range=f"{SHEET_NAME}!A1",
        valueInputOption="RAW",
        body=body
    ).execute()


# ===================== DISCORD ALERT =====================
def discord_notify(msg):
    webhook = DiscordWebhook(
        url=f"https://discord.com/api/webhooks/{DISCORD_TOKEN}",
        content=msg
    )
    webhook.execute()


# ===================== MAIN AUTO ENGINE =====================
def nexus_engine():
    prompt = "Generate a high-profit automation strategy and trending digital product idea."
    result = ai_generate(prompt)

    print("AI OUTPUT:", result)

    log_to_supabase(result)
    log_to_sheet(result)
    discord_notify("NEXUS-PRIME AI EXECUTED:\n" + result)


# ===================== SCHEDULER =====================
schedule.every(6).hours.do(nexus_engine)

print("🔥 NEXUS-PRIME ACTIVE — FULL AUTONOMOUS MODE")

if AUTO_MODE:
    while True:
        schedule.run_pending()
        time.sleep(30)
