# main.py - NEXUS-PRIME: Adaptive Marketing System using Supabase, Groq AI, and Multi-Platform Messaging

import asyncio
import logging
import random
import time
import re
import os
import json
import smtplib
from email.mime.text import MIMEText
from supabase import create_client
from loguru import logger as loguru_logger
from tenacity import retry, stop_after_attempt, wait_exponential
from fake_useragent import UserAgent
import requests
from groq import Groq
import tweepy

# Configure logging with Loguru for advanced, rotatable logs
loguru_logger.add("nexus_prime.log", rotation="10 MB", level="INFO", format="{time} {level} {message}")
logger = loguru_logger

# Load environment variables (secure, no hardcoding)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Fallback if Groq fails
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CX = os.getenv("GOOGLE_CX")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN")
INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

# Validate essential secrets
required_secrets = [SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY, GOOGLE_API_KEY, GOOGLE_CX, SMTP_SERVER, SMTP_USERNAME, SMTP_PASSWORD, TWITTER_ACCESS_TOKEN, TWITTER_API_SECRET]
if not all(required_secrets):
    raise ValueError("Missing required environment variables. Check setup.")

class Campaign:
    def __init__(self, row):
        self.id = row["id"]
        self.name = row["name"]
        self.keywords = [k.strip() for k in row.get("keywords", "").split(",") if k.strip()]
        self.usp = row.get("usp", "")
        self.product_link = row.get("product_link", "")
        self.max_leads = row.get("max_leads", 10)
        self.min_intent = row.get("min_intent_score", 70)
        self.target_platforms = row.get("target_platforms", "twitter,email,linkedin").split(",")

class SupabaseService:
    def __init__(self):
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def get_active_campaigns(self):
        res = self.client.table("campaigns").select("*").eq("status", "active").execute()
        return [Campaign(row) for row in res.data or []]

    def insert_or_update_lead(self, payload):
        try:
            existing = self.client.table("leads").select("id").eq("url", payload["url"]).execute()
            if existing.data:
                res = self.client.table("leads").update(payload).eq("id", existing.data[0]["id"]).execute()
            else:
                res = self.client.table("leads").insert(payload).execute()
            return bool(res.data)
        except Exception as e:
            logger.error(f"Lead operation failed: {e}")
            return False

class LeadFinder:
    def __init__(self):
        self.ua = UserAgent()
        self.session = requests.Session()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def search_leads(self, keywords, max_results=10):
        query = f"{' '.join(keywords)} site:twitter.com OR site:linkedin.com OR site:reddit.com buy OR purchase OR need"
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "q": query,
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CX,
            "num": min(max_results, 10)
        }
        headers = {"User-Agent": self.ua.random}
        r = self.session.get(url, params=params, headers=headers, timeout=15)
        r.raise_for_status()
        items = r.json().get("items", [])
        leads = []
        for item in items:
            lead = {
                "url": item["link"],
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "platform": self.detect_platform(item["link"])
            }
            lead["contact"] = self.extract_contact(lead)
            leads.append(lead)
            time.sleep(random.uniform(1, 3))  # Evasive delay
        return leads

    def detect_platform(self, url):
        if "twitter.com" in url or "x.com" in url:
            return "twitter"
        elif "linkedin.com" in url:
            return "linkedin"
        elif "reddit.com" in url:
            return "reddit"
        elif "instagram.com" in url:
            return "instagram"
        return "email"  # Default to email if contact found

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=5))
    def extract_contact(self, lead):
        # Browse profile or bio
        if lead["platform"] == "twitter":
            username = re.search(r'twitter\.com/([^/]+)', lead["url"]) or re.search(r'x\.com/([^/]+)', lead["url"])
            if username:
                username = username.group(1)
                profile_url = f"https://twitter.com/{username}"
                headers = {"User-Agent": self.ua.random}
                r = self.session.get(profile_url, headers=headers, timeout=10)
                bio = re.search(r'data-testid="UserDescription">(.*?)</div>', r.text, re.DOTALL)
                if bio:
                    bio_text = bio.group(1)
                    email = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', bio_text)
                    if email:
                        return {"type": "email", "value": email[0]}
                    # Else DM handle
                    return {"type": "dm", "value": username}
        # Similar for other platforms (expand as needed)
        elif lead["platform"] == "linkedin":
            return {"type": "message", "value": lead["url"]}  # Use API to message
        # Regex on snippet for email
        email = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', lead["snippet"])
        if email:
            return {"type": "email", "value": email[0]}
        return None

class MessageGenerator:
    def __init__(self):
        self.groq_client = Groq(api_key=GROQ_API_KEY)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def generate_personalized_message(self, lead, campaign):
        prompt = f"""
        Generate a personalized, reassuring marketing message for a potential buyer.
        Lead context: {lead['snippet']}
        Product USP: {campaign.usp}
        Product link: {campaign.product_link}
        Make it friendly, non-spammy, highlight benefits, include call to action.
        Keep under 200 words. Adapt to platform: short for Twitter, detailed for email.
        """
        response = self.groq_client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[{"role": "system", "content": "You are a helpful marketing assistant."}, {"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200
        )
        message = response.choices[0].message.content.strip()
        return message

class MessageSender:
    def __init__(self):
        self.ua = UserAgent()

    async def send_message(self, lead, message):
        contact = lead.get("contact")
        if not contact:
            return False
        platform = lead["platform"]
        logger.info(f"Sending via {platform} to {contact['value']}")

        try:
            if contact["type"] == "email":
                return self.send_email(contact["value"], message)
            elif platform == "twitter" and contact["type"] == "dm":
                return self.send_twitter_dm(contact["value"], message)
            elif platform == "linkedin":
                return self.send_linkedin_message(contact["value"], message)
            # Add Instagram, Reddit, Discord as needed
            else:
                logger.warning(f"No sender for {platform}")
                return False
        except Exception as e:
            logger.error(f"Send failed: {e}")
            return False

    def send_email(self, to_email, message):
        msg = MIMEText(message)
        msg['Subject'] = "Personalized Offer Based on Your Interest"
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, to_email, msg.as_string())
        return True

    def send_twitter_dm(self, username, message):
        # Setup Tweepy with OAuth 1.0a User context (for DMs)
        auth = tweepy.OAuth1UserHandler(consumer_key="your_consumer_key", consumer_secret=TWITTER_API_SECRET,  # Need consumer key/secret, assume in secrets or env
                                        access_token=TWITTER_ACCESS_TOKEN, access_token_secret=TWITTER_API_SECRET)
        api = tweepy.API(auth)
        user_id = api.get_user(screen_name=username).id
        api.send_direct_message(recipient_id=user_id, text=message)
        return True

    def send_linkedin_message(self, profile_url, message):
        # Use linkedin-api library
        from linkedin_api import Linkedin
        api = Linkedin('dummy', 'dummy', access_token=LINKEDIN_ACCESS_TOKEN)  # Uses token
        profile_id = api.search_people(keywords=profile_url.split('/')[-1])[0]['public_id']
        api.send_message(recipients=[profile_id], message_body=message)
        return True

# Main loop
async def main():
    db = SupabaseService()
    message_gen = MessageGenerator()
    finder = LeadFinder()
    sender = MessageSender()

    campaigns = db.get_active_campaigns()
    if not campaigns:
        logger.info("No active campaigns.")
        return

    for campaign in campaigns:
        logger.info(f"Processing campaign: {campaign.name}")
        leads = finder.search_leads(campaign.keywords, campaign.max_leads)
        for lead in leads:
            if lead["contact"]:
                message = message_gen.generate_personalized_message(lead, campaign)
                success = await sender.send_message(lead, message)
                payload = {
                    "campaign_id": campaign.id,
                    "url": lead["url"],
                    "intent_score": IntentScorer.score(lead["snippet"], campaign.keywords),
                    "ai_analysis_text": "Adaptive extraction and send",
                    "message_draft": message,
                    "status": "sent" if success else "failed"
                }
                db.insert_or_update_lead(payload)
            await asyncio.sleep(random.uniform(5, 15))  # Evasive pacing

if __name__ == "__main__":
    asyncio.run(main())
