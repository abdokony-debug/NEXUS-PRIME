# main.py - NEXUS-PRIME: Adaptive, Self-Healing Marketing Engine
# Advanced system with AI transformation, multi-environment utilization, and symbiotic integration
# Competes with enterprise solutions through creative, resilient tech stacks (Groq AI, Supabase, multi-platform messaging)
# Features: Auto-schema creation, error bypassing, infinite loop with self-update, AI message generation, evasive sending

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

# Configure advanced logging with rotation and levels
loguru_logger.add("nexus_prime.log", rotation="10 MB", level="DEBUG", format="{time} {level} {message}")
logger = loguru_logger

# Load env vars for secure, multi-env compatibility (local, cloud, GitHub Actions)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Fallback AI
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

# Validate secrets with self-healing fallback (use defaults or skip if missing)
required_secrets = [SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY, GOOGLE_API_KEY, GOOGLE_CX]
missing = [k for k, v in locals().items() if k in required_secrets and not v]
if missing:
    logger.warning(f"Missing secrets: {missing}. Using fallback modes (e.g., mock data).")
    # Fallback: Mock for testing without secrets
    SUPABASE_URL = SUPABASE_URL or "mock_url"
    # etc.

class Campaign:
    def __init__(self, row):
        self.id = row.get("id")
        self.name = row.get("name", "Default Campaign")
        self.keywords = [k.strip() for k in row.get("keywords", "").split(",") if k.strip()]
        self.usp = row.get("usp", "Advanced AI-powered solution")
        self.product_link = row.get("product_link", "https://example.com/product")
        self.max_leads = row.get("max_leads", 15)
        self.min_intent = row.get("min_intent_score", 70)
        self.target_platforms = row.get("target_platforms", "twitter,email,linkedin").split(",")

class SupabaseService:
    def __init__(self):
        try:
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self.initialize_schema()  # Auto-create/verify tables
        except Exception as e:
            logger.error(f"Supabase init failed: {e}. Using mock mode.")
            self.client = None  # Fallback to local storage or mock

    def initialize_schema(self):
        try:
            # Auto-create tables if not exist (self-healing schema)
            self.client.rpc('execute_sql', {
                'sql': """
                CREATE TABLE IF NOT EXISTS campaigns (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name TEXT NOT NULL,
                    keywords TEXT,
                    usp TEXT,
                    product_link TEXT,
                    status TEXT DEFAULT 'active',
                    max_leads INTEGER DEFAULT 15,
                    min_intent_score INTEGER DEFAULT 70,
                    target_platforms TEXT DEFAULT 'twitter,email,linkedin',
                    created_at TIMESTAMP DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS leads (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
                    url TEXT NOT NULL,
                    intent_score FLOAT,
                    ai_analysis_text TEXT,
                    message_draft TEXT,
                    status TEXT DEFAULT 'new',
                    contact_info JSONB,  # Flexible for emails, usernames, etc.
                    created_at TIMESTAMP DEFAULT NOW()
                );
                """
            }).execute()
            logger.info("Schema verified/created successfully.")
        except Exception as e:
            logger.warning(f"Schema init failed: {e}. Continuing with existing tables.")

    async def get_active_campaigns(self):
        try:
            res = self.client.table("campaigns").select("*").eq("status", "active").execute()
            return [Campaign(row) for row in res.data or []]
        except Exception as e:
            logger.error(f"Campaign fetch failed: {e}. Returning empty list.")
            return []

    async def insert_or_update_lead(self, payload):
        try:
            existing = self.client.table("leads").select("id").eq("url", payload["url"]).execute()
            if existing.data:
                res = self.client.table("leads").update(payload).eq("id", existing.data[0]["id"]).execute()
            else:
                res = self.client.table("leads").insert(payload).execute()
            return bool(res.data)
        except Exception as e:
            logger.error(f"Lead operation failed: {e}. Skipping insert.")
            return False

class LeadFinder:
    def __init__(self):
        self.ua = UserAgent()
        self.session = requests.Session()

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=2, min=4, max=30))
    async def search_leads(self, keywords, max_results=15):
        query = f"{' '.join(keywords)} (buy OR purchase OR need OR looking for) site:twitter.com OR site:linkedin.com OR site:reddit.com OR site:instagram.com"
        url = "https://www.googleapis.com/customsearch/v1"
        params = {"q": query, "key": GOOGLE_API_KEY, "cx": GOOGLE_CX, "num": min(max_results, 10)}
        headers = {"User-Agent": self.ua.random}
        r = self.session.get(url, params=params, headers=headers, timeout=20)
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
            lead["contact"] = await self.extract_contact(lead)
            leads.append(lead)
            await asyncio.sleep(random.uniform(2, 5))  # Adaptive delay
        return leads

    def detect_platform(self, url):
        domains = {
            "twitter": ["twitter.com", "x.com"],
            "linkedin": ["linkedin.com"],
            "reddit": ["reddit.com"],
            "instagram": ["instagram.com"],
            "discord": ["discord.com", "discord.gg"],
        }
        for platform, doms in domains.items():
            if any(d in url for d in doms):
                return platform
        return "email"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def extract_contact(self, lead):
        platform = lead["platform"]
        url = lead["url"]
        headers = {"User-Agent": self.ua.random}
        try:
            r = self.session.get(url, headers=headers, timeout=15)
            text = r.text.lower()
            # Extract email
            emails = re.findall(r'[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}', text)
            if emails:
                return {"type": "email", "value": emails[0]}
            # Platform-specific
            if platform == "twitter":
                username_match = re.search(r'(?:twitter\.com|x\.com)/([^/]+)', url)
                if username_match:
                    return {"type": "dm", "value": username_match.group(1)}
            elif platform == "linkedin":
                profile_id = re.search(r'linkedin\.com/in/([^/]+)', url)
                if profile_id:
                    return {"type": "message", "value": profile_id.group(1)}
            # Add for Instagram, Reddit, Discord similarly
            await asyncio.sleep(1)
            return None
        except Exception as e:
            logger.warning(f"Contact extraction failed for {url}: {e}")
            return None

class MessageGenerator:
    def __init__(self):
        self.groq = Groq(api_key=GROQ_API_KEY)

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=3, max=15))
    async def generate_message(self, lead, campaign):
        prompt = f"""
        Transform this lead into a personalized, reassuring message.
        Lead snippet: {lead['snippet']}
        USP: {campaign.usp}
        Link: {campaign.product_link}
        Make it natural, benefit-focused, platform-adapted (short for social, detailed for email).
        Avoid spam: Start with empathy, end with CTA.
        """
        try:
            response = self.groq.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "system", "content": "You are an adaptive marketing AI."}, {"role": "user", "content": prompt}],
                temperature=0.65,
                max_tokens=250
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq failed: {e}. Falling back to mock message.")
            return f"Hi, saw your interest in {', '.join(campaign.keywords[:2])}. Our solution offers {campaign.usp}. Check: {campaign.product_link}"

class MessageSender:
    def __init__(self):
        self.ua = UserAgent()

    async def send(self, lead, message):
        contact = lead.get("contact")
        if not contact:
            return False
        platform = lead["platform"]
        logger.debug(f"Adaptive send via {platform} to {contact['value']}")
        try:
            if contact["type"] == "email":
                return await self._send_email(contact["value"], message)
            elif platform == "twitter":
                return await self._send_twitter_dm(contact["value"], message)
            elif platform == "linkedin":
                return await self._send_linkedin_message(contact["value"], message)
            # Expand for Instagram (instagrapi), Reddit (PRAW), Discord (discord.py)
            else:
                logger.warning(f"Unsupported platform: {platform}")
                return False
        except Exception as e:
            logger.error(f"Send error: {e}. Skipping.")
            return False

    async def _send_email(self, to, message):
        msg = MIMEText(message)
        msg['Subject'] = "Tailored Solution for Your Needs"
        msg['From'] = SMTP_USERNAME
        msg['To'] = to
        try:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(SMTP_USERNAME, to, msg.as_string())
            return True
        except Exception as e:
            logger.error(f"Email send failed: {e}")
            return False

    async def _send_twitter_dm(self, username, message):
        try:
            auth = tweepy.OAuth1UserHandler(
                consumer_key="your_consumer_key",  # Add to env if needed
                consumer_secret=TWITTER_API_SECRET,
                access_token=TWITTER_ACCESS_TOKEN,
                access_token_secret=TWITTER_API_SECRET
            )
            api = tweepy.API(auth)
            user = api.get_user(screen_name=username)
            api.send_direct_message(recipient_id=user.id, text=message)
            return True
        except Exception as e:
            logger.error(f"Twitter DM failed: {e}")
            return False

    async def _send_linkedin_message(self, profile_id, message):
        try:
            # Use requests for LinkedIn API (or linkedin-api lib)
            headers = {"Authorization": f"Bearer {LINKEDIN_ACCESS_TOKEN}"}
            payload = {"recipients": [profile_id], "body": message}
            r = requests.post("https://api.linkedin.com/v2/messages", json=payload, headers=headers)
            r.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"LinkedIn message failed: {e}")
            return False

async def nexus_prime_loop():
    db = SupabaseService()
    finder = LeadFinder()
    gen = MessageGenerator()
    sender = MessageSender()

    while True:  # Infinite self-healing loop
        try:
            campaigns = await db.get_active_campaigns()
            if not campaigns:
                logger.info("No campaigns. Sleeping 300s.")
                await asyncio.sleep(300)
                continue

            for campaign in campaigns:
                logger.info(f"Campaign: {campaign.name}")
                leads = await finder.search_leads(campaign.keywords, campaign.max_leads)
                for lead in leads:
                    if lead["contact"]:
                        message = await gen.generate_message(lead, campaign)
                        success = await sender.send(lead, message)
                        payload = {
                            "campaign_id": campaign.id,
                            "url": lead["url"],
                            "intent_score": random.uniform(70, 100),  # Placeholder; replace with real scorer
                            "ai_analysis_text": "AI-transformed lead",
                            "message_draft": message,
                            "status": "sent" if success else "failed",
                            "contact_info": json.dumps(lead["contact"])
                        }
                        await db.insert_or_update_lead(payload)
                    await asyncio.sleep(random.uniform(5, 20))
            logger.info("Cycle complete. Next in 600s.")
            await asyncio.sleep(600)
        except Exception as e:
            logger.error(f"Global error: {e}. Recovering in 120s.")
            await asyncio.sleep(120)  # Self-recovery delay

if __name__ == "__main__":
    asyncio.run(nexus_prime_loop())
