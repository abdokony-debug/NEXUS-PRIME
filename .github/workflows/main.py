import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import pytz
import requests
import random
import time
from supabase import create_client, Client

# ------------------------- Logging -------------------------
logging.basicConfig(
    filename='nexus_prime.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ------------------------- Environment -------------------------
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CX = os.getenv("GOOGLE_CX")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

MAX_SEARCH_RESULTS = int(os.getenv("MAX_SEARCH_RESULTS", 50))

# ------------------------- Helper Functions -------------------------
def fetch_active_campaigns():
    """جلب جميع الحملات النشطة"""
    try:
        response = supabase.table("campaigns").select("*").eq("status", "active").execute()
        campaigns = response.data if response.data else []
        logging.info(f"{len(campaigns)} active campaigns fetched.")
        return campaigns
    except Exception as e:
        logging.error(f"Failed to fetch campaigns: {e}")
        return []

def google_search(keywords, region, num_results=MAX_SEARCH_RESULTS):
    """البحث في Google عن العملاء المحتملين"""
    results = []
    try:
        start = 1
        query = f"{keywords} {region}" if region else keywords
        while len(results) < num_results:
            url = f"https://www.googleapis.com/customsearch/v1?key={GOOGLE_API_KEY}&cx={GOOGLE_CX}&q={query}&start={start}"
            r = requests.get(url)
            if r.status_code != 200:
                logging.warning(f"Google API returned {r.status_code}")
                break
            data = r.json()
            items = data.get("items", [])
            for item in items:
                link = item.get("link")
                snippet = item.get("snippet", "")
                results.append({"link": link, "snippet": snippet})
                if len(results) >= num_results:
                    break
            start += 10
            time.sleep(1)
    except Exception as e:
        logging.error(f"Google search failed: {e}")
    logging.info(f"Found {len(results)} search results for '{query}'")
    return results

def extract_emails(search_results):
    """استخراج أي بريد إلكتروني من النتائج"""
    emails = set()
    for r in search_results:
        snippet = r.get("snippet", "")
        words = snippet.split()
        for w in words:
            if "@" in w and "." i
