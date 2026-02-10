# main.py

import asyncio
import logging
import random
import time
import requests
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = "https://your-project-ref.supabase.co"
SUPABASE_KEY = "your-anon-or-service-key"

GOOGLE_API_KEY = "your-google-custom-search-api-key"
GOOGLE_CX     = "your-custom-search-engine-id"

class Campaign:
    def __init__(self, row):
        self.id             = row["id"]
        self.name           = row["name"]
        self.keywords       = [k.strip() for k in row["keywords"].split(",")] if row["keywords"] else []
        self.usp            = row["usp"] or ""
        self.product_link   = row["product_link"] or ""
        self.max_leads      = row.get("max_leads", 15)
        self.min_intent     = row.get("min_intent_score", 70)


class SupabaseService:
    def __init__(self):
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def get_active_campaigns(self):
        res = self.client.table("campaigns") \
              .select("*") \
              .eq("status", "active") \
              .execute()
        return [Campaign(row) for row in res.data]

    def insert_lead(self, payload):
        try:
            res = self.client.table("leads").insert(payload).execute()
            return bool(res.data)
        except Exception as e:
            logger.error(f"Insert failed: {e}")
            return False


class LeadFinder:
    def __init__(self):
        self.session = requests.Session()

    def search(self, keywords, num=10):
        query = " ".join(keywords)
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "q": query + " site:twitter.com",
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CX,
            "num": min(num, 10)
        }

        try:
            r = self.session.get(url, params=params, timeout=15)
            r.raise_for_status()
            items = r.json().get("items", [])
            return [
                {
                    "url": item["link"],
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", "")
                }
                for item in items
            ]
        except Exception as e:
            logger.warning(f"Search failed: {e}")
            return []


class IntentScorer:
    @staticmethod
    def score(text, keywords):
        if not text or not keywords:
            return 0.0
        text_lower = text.lower()
        matches = sum(1 for kw in keywords if kw.lower() in text_lower)
        unique_ratio = matches / len(keywords)
        return round(50 + unique_ratio * 50, 1)


async def process_campaign(campaign):
    db = SupabaseService()
    finder = LeadFinder()

    results = finder.search(campaign.keywords, num=campaign.max_leads)

    inserted = 0
    for item in results:
        content = item["title"] + " " + item["snippet"]
        score = IntentScorer.score(content, campaign.keywords)

        if score < campaign.min_intent:
            continue

        payload = {
            "campaign_id":      campaign.id,
            "url":              item["url"],
            "intent_score":     score,
            "ai_analysis_text": f"Keyword matches leading to score {score}",
            "message_draft":    f"Hi, saw your post about {', '.join(campaign.keywords[:3])}. {campaign.usp} – {campaign.product_link}",
            "status":           "ready"
        }

        if db.insert_lead(payload):
            inserted += 1
            logger.info(f"Inserted lead: {item['url']} (score: {score})")

        await asyncio.sleep(random.uniform(2.0, 5.0))

    logger.info(f"Campaign {campaign.name} completed – {inserted} leads inserted")


async def main_loop():
    db = SupabaseService()

    while True:
        try:
            campaigns = db.get_active_campaigns()

            if not campaigns:
                logger.info("No active campaigns – checking again in 300 seconds")
                await asyncio.sleep(300)
                continue

            for campaign in campaigns:
                logger.info(f"Starting campaign: {campaign.name}")
                await process_campaign(campaign)

            logger.info("All campaigns processed – next check in 600 seconds")
            await asyncio.sleep(600)

        except Exception as e:
            logger.exception(f"Loop error: {e}")
            await asyncio.sleep(120)


if __name__ == "__main__":
    asyncio.run(main_loop())
