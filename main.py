# main.py

import asyncio
import logging
import random
import time
from supabase import create_client, Client
from transformers import pipeline
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = "https://your-project-ref.supabase.co"
SUPABASE_KEY = "your-anon-or-service-key"

GOOGLE_API_KEY = "your-google-custom-search-api-key"
GOOGLE_CX     = "your-custom-search-engine-id"

class Platform:
    EMAIL        = "email"
    LINKEDIN     = "linkedin"
    TWITTER      = "twitter"
    REDDIT       = "reddit"
    FACEBOOK     = "facebook"
    INSTAGRAM    = "instagram"
    GITHUB       = "github"
    PRODUCTHUNT  = "producthunt"
    MEDIUM       = "medium"
    QUORA        = "quora"
    HACKERNEWS   = "hackernews"
    STACKOVERFLOW= "stackoverflow"
    GENERIC      = "generic"


class Lead:
    def __init__(self, url, platform=Platform.GENERIC):
        self.url = url
        self.platform = platform
        self.intent_score = 0.0
        self.contacted = False


class Campaign:
    def __init__(self, row):
        self.id             = row["id"]
        self.name           = row["name"]
        self.keywords       = row["keywords"].split(",") if row["keywords"] else []
        self.usp            = row["usp"] or ""
        self.product_link   = row["product_link"] or ""
        self.target_region  = row["target_region"] or ""
        self.max_leads      = row.get("max_leads", 10)
        self.min_intent     = row.get("min_intent_score", 75)


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
            logger.error(f"Insert lead failed: {e}")
            return False


class IntentAnalyzer:
    def __init__(self):
        self.classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

    def score(self, text):
        if not text.strip():
            return 0.0

        candidate_labels = ["strong buying intent", "interested / asking questions", "neutral", "negative / spam"]
        result = self.classifier(text, candidate_labels, multi_label=False)

        top_label = result["labels"][0]
        top_score = result["scores"][0] * 100

        if top_label in ("strong buying intent", "interested / asking questions"):
            return round(top_score, 1)
        return 0.0


class LeadFinder:
    def __init__(self):
        self.session = requests.Session()

    def search(self, query, num=8):
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "q": query + " site:twitter.com",
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CX,
            "num": min(num, 10)
        }

        try:
            r = self.session.get(url, params=params, timeout=12)
            r.raise_for_status()
            items = r.json().get("items", [])
            return [item["link"] for item in items if "link" in item]
        except Exception as e:
            logger.warning(f"Google CSE failed: {e}")
            return []


class RateLimiter:
    def __init__(self):
        self.history = {}
        self.platform_order = ["twitter", "linkedin", "reddit", "email", "quora"]

    def can_send(self, platform):
        now = time.time()
        if platform not in self.history:
            self.history[platform] = []
        recent = [t for t in self.history[platform] if now - t < 3600]
        self.history[platform] = recent
        return len(recent) < 25   # very conservative default

    def record_send(self, platform):
        self.history.setdefault(platform, []).append(time.time())


class MessageSender:
    def __init__(self, limiter):
        self.limiter = limiter

    async def try_send(self, lead, campaign, message):
        for platform in self.limiter.platform_order:
            if self.limiter.can_send(platform):
                # Placeholder – real implementation depends on platform SDK / API credentials
                logger.info(f"Sending via {platform} → {lead.url}")
                self.limiter.record_send(platform)
                lead.contacted = True
                return True, platform
            await asyncio.sleep(1.2)
        return False, None


async def process_one_campaign(campaign):
    db = SupabaseService()
    finder = LeadFinder()
    analyzer = IntentAnalyzer()
    sender = MessageSender(RateLimiter())

    query = " ".join(campaign.keywords)
    urls = finder.search(query, num=campaign.max_leads)

    inserted = 0

    for url in urls:
        score = analyzer.score(url)   # in real system → fetch tweet text

        if score < campaign.min_intent:
            continue

        payload = {
            "campaign_id":     campaign.id,
            "url":             url,
            "intent_score":    score,
            "ai_analysis_text": f"zero-shot score: {score}",
            "message_draft":   f"Hi, saw your post. Our {campaign.usp}. Check {campaign.product_link}",
            "status":          "new"
        }

        if db.insert_lead(payload):
            inserted += 1

        await asyncio.sleep(random.uniform(1.8, 4.2))

    logger.info(f"Campaign {campaign.name} → inserted {inserted} leads")


async def watch_and_process():
    db = SupabaseService()

    while True:
        try:
            campaigns = db.get_active_campaigns()

            if not campaigns:
                logger.info("No active campaigns. Sleeping 300s")
                await asyncio.sleep(300)
                continue

            for campaign in campaigns:
                logger.info(f"Processing campaign: {campaign.name}")
                await process_one_campaign(campaign)

            logger.info("Cycle finished. Waiting 600 seconds before next check.")
            await asyncio.sleep(600)

        except Exception as e:
            logger.exception(f"Main loop error: {e}")
            await asyncio.sleep(120)


if __name__ == "__main__":
    asyncio.run(watch_and_process())
