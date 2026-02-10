import os, httpx, logging, time
from datetime import datetime
from supabase import create_client
from email.mime.text import MIMEText
import smtplib
from telegram import Bot
import discord
from groq import Groq

# ================== CONFIG ==================
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

GOOGLE_API_KEY = os.environ["GOOGLE_API_KEY"]
GOOGLE_CX = os.environ["GOOGLE_CX"]

GROQ_API_KEY = os.environ["GROQ_API_KEY"]

SMTP_SERVER = os.environ["SMTP_SERVER"]
SMTP_PORT = int(os.environ["SMTP_PORT"])
SMTP_USERNAME = os.environ["SMTP_USERNAME"]
SMTP_PASSWORD = os.environ["SMTP_PASSWORD"]

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN")

MAX_CONCURRENT_CAMPAIGNS = int(os.environ.get("MAX_CONCURRENT_CAMPAIGNS", 3))
REQUEST_TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", 30))
RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_HOUR", 20))

# ================== LOGGING ==================
logging.basicConfig(level=logging.INFO, filename="nexus_prime.log", format="%(asctime)s - %(message)s")

# ================== CLIENTS ==================
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
groq = Groq(api_key=GROQ_API_KEY)

# ================== AI INTENT ANALYSIS ==================
def analyze_intent(text):
    try:
        r = groq.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role":"user","content":f"Rate buyer intent 0-1:\n{text}"}],
            temperature=0
        )
        return float(r.choices[0].message.content.strip())
    except:
        return 0.1

# ================== GOOGLE SEARCH ==================
def google_search(query):
    url = "https://www.googleapis.com/customsearch/v1"
    params = {"key": GOOGLE_API_KEY, "cx": GOOGLE_CX, "q": query, "num": 10}
    r = httpx.get(url, params=params, timeout=REQUEST_TIMEOUT)
    data = r.json().get("items", [])
    return [{"url": i["link"], "snippet": i.get("snippet","")} for i in data]

# ================== EMAIL SEND ==================
def send_email(to_email, subject, body):
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_USERNAME
        msg["To"] = to_email

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USERNAME, SMTP_PASSWORD)
            s.send_message(msg)
        return True
    except Exception as e:
        logging.error(f"EMAIL FAIL {to_email} {e}")
        return False

# ================== TELEGRAM SEND ==================
def send_telegram(chat_id, text):
    try:
        bot = Bot(TELEGRAM_BOT_TOKEN)
        bot.send_message(chat_id, text)
        return True
    except Exception as e:
        logging.error(f"TG FAIL {chat_id} {e}")
        return False

# ================== DISCORD SEND ==================
class DiscordBot(discord.Client):
    async def send_dm(self, user_id, msg):
        user = await self.fetch_user(user_id)
        await user.send(msg)

# ================== MESSAGE GENERATOR ==================
def generate_message(product, lead_url):
    return f"Hello, I found you interested in this topic.\nThis product may help:\n{product}\nSource: {lead_url}"

# ================== MAIN ENGINE ==================
def main():
    campaigns = supabase.table("campaigns").select("*").eq("status","active").execute().data
    if not campaigns:
        logging.info("NO ACTIVE CAMPAIGNS")
        return

    for camp in campaigns[:MAX_CONCURRENT_CAMPAIGNS]:
        query = camp["keywords"]
        product = camp["product_link"]
        results = google_search(query)

        for r in results:
            url = r["url"]
            snippet = r["snippet"]

            intent = analyze_intent(snippet)
            if intent < 0.4:
                continue  # ignore low buyers

            msg = generate_message(product, url)

            lead = {
                "campaign_id": camp["id"],
                "url": url,
                "intent_score": intent,
                "ai_analysis": snippet,
                "message_draft": msg,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            }
            supabase.table("leads").insert(lead).execute()

            # Attempt email extraction (basic)
            if "@" in snippet:
                email = snippet.split("@")[0].split()[-1]+"@"+snippet.split("@")[1].split()[0]
                send_email(email, "Product Recommendation", msg)

            time.sleep(3600 / RATE_LIMIT)

if __name__ == "__main__":
    main()
