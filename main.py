# main.py - Main script for the Quantum Marketing System

import time
import random
import asyncio
import logging
import re
import requests
from enum import Enum
from supabase import create_client, Client
from transformers import pipeline

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class CampaignMode(Enum):
    BALANCED = "balanced"

class Platform(Enum):
    EMAIL = "email"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    REDDIT = "reddit"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    GITHUB = "github"
    PRODUCTHUNT = "producthunt"
    MEDIUM = "medium"
    QUORA = "quora"
    HACKERNEWS = "hackernews"
    STACKOVERFLOW = "stackoverflow"
    GENERIC = "generic"

class Lead:
    def __init__(self, id, platform, url, intent_score=0, contacted=False, response_received=False):
        self.id = id
        self.platform = platform
        self.url = url
        self.intent_score = intent_score
        self.contacted = contacted
        self.response_received = response_received

class Campaign:
    def __init__(self, id, name, keywords, usp, status, product_link, target_region, max_leads, auto_send=True, filters=None, platforms=None):
        self.id = id
        self.name = name
        self.keywords = keywords if isinstance(keywords, list) else keywords.split(',')
        self.usp = usp
        self.status = status
        self.product_link = product_link
        self.target_region = target_region
        self.max_leads = max_leads
        self.max_targets = max_leads
        self.auto_send = auto_send
        self.filters = filters or {}
        self.platforms = platforms or list(Platform)

class NeuralEngine:
    def __init__(self):
        self.sentiment_analyzer = pipeline("sentiment-analysis")
        self.zero_shot_classifier = pipeline("zero-shot-classification")

    def analyze_intent(self, lead):
        lead_text = lead.url  # Or fetch content if needed
        candidate_labels = ["intent to buy", "inquiry", "complaint", "irrelevant"]
        classification = self.zero_shot_classifier(lead_text, candidate_labels)
        intent = classification['labels'][0]
        score = classification['scores'][0] * 100
        reason = f"Intent: {intent}"
        suggested_hook = f"Based on {intent}, try our product!"
        action = "CONTACT" if score >= 75 else "IGNORE"
        return {'score': score, 'reason': reason, 'suggested_hook': suggested_hook, 'action': action}

class CyberHunter:
    def __init__(self, search_api_key, search_cx=None):
        self.search_api_key = search_api_key
        self.search_cx = search_cx

    async def scan_platform(self, platform, keywords, limit=15):
        query = f"{keywords} site:{platform.value}.com"
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'q': query,
            'key': self.search_api_key,
            'cx': self.search_cx,
            'num': limit
        }
        response = requests.get(url, params=params)
        if response.status_code == 200:
            items = response.json().get('items', [])
            leads = [Lead(id=i, platform=platform, url=item['link']) for i, item in enumerate(items)]
            return leads
        return []

class SupabaseClient:
    def __init__(self, supabase_url, supabase_key):
        self.client: Client = create_client(supabase_url, supabase_key)

    def fetch_campaigns(self):
        response = self.client.table('campaigns').select('*').eq('status', 'active').execute()
        if response.data:
            return [Campaign(**data) for data in response.data]
        return []

    def store_lead(self, lead_payload):
        response = self.client.table('leads').insert(lead_payload).execute()
        if response.data:
            logger.info("Lead stored successfully.")
        else:
            logger.error("Failed to store lead.")

class IntelligentRateLimiter:
    def __init__(self):
        self.platform_limits = {
            'email': {'per_hour': 100, 'per_day': 1000},
            'linkedin': {'per_hour': 50, 'per_day': 300},
            'twitter': {'per_hour': 30, 'per_day': 200},
            'reddit': {'per_hour': 20, 'per_day': 100},
            'facebook': {'per_hour': 25, 'per_day': 150},
            'instagram': {'per_hour': 15, 'per_day': 80},
            'github': {'per_hour': 30, 'per_day': 180},
            'producthunt': {'per_hour': 20, 'per_day': 120},
            'medium': {'per_hour': 25, 'per_day': 160},
            'quora': {'per_hour': 30, 'per_day': 200},
            'hackernews': {'per_hour': 15, 'per_day': 90},
            'stackoverflow': {'per_hour': 20, 'per_day': 120}
        }
        self.usage = {platform: {'hourly': [], 'daily': []} for platform in self.platform_limits}
        self.rotation_schedule = self._generate_rotation_schedule()
        self.current_platform_index = 0
        self.last_hour_reset = time.time()
        self.last_day_reset = time.time()
        self.metrics = {'total_sends': 0, 'rotations': 0, 'platform_switches': 0, 'wait_time_total': 0}

    def _generate_rotation_schedule(self):
        sorted_platforms = sorted(self.platform_limits.items(), key=lambda x: x[1]['per_day'], reverse=True)
        schedule = []
        for platform, limits in sorted_platforms:
            weight = max(1, int(limits['per_day'] / 50))
            schedule.extend([platform] * weight)
        return schedule

    def get_next_available_platform(self):
        now = time.time()
        if now - self.last_hour_reset >= 3600:
            self._reset_hourly_counters()
            self.last_hour_reset = now
        if now - self.last_day_reset >= 86400:
            self._reset_daily_counters()
            self.last_day_reset = now
        platforms_tried = 0
        max_tries = len(self.rotation_schedule)
        while platforms_tried < max_tries:
            platform = self.rotation_schedule[self.current_platform_index]
            self.current_platform_index = (self.current_platform_index + 1) % len(self.rotation_schedule)
            platforms_tried += 1
            if self._check_platform_availability(platform):
                self.metrics['platform_switches'] += 1
                return {
                    'platform': platform,
                    'available': True,
                    'hourly_remaining': self._get_hourly_remaining(platform),
                    'daily_remaining': self._get_daily_remaining(platform),
                    'next_reset_hour': self.last_hour_reset + 3600,
                    'next_reset_day': self.last_day_reset + 86400
                }
        optimal_wait = self._calculate_optimal_wait_time()
        self.current_platform_index = (self.current_platform_index + 1) % len(self.rotation_schedule)
        self.metrics['rotations'] += 1
        return {
            'platform': None,
            'available': False,
            'wait_time': optimal_wait,
            'suggestion': 'All platforms at capacity. System will rotate automatically.',
            'next_platform_check': time.time() + optimal_wait
        }

    def _check_platform_availability(self, platform):
        if platform not in self.platform_limits:
            return False
        now = time.time()
        hourly_used = sum(1 for t in self.usage[platform]['hourly'] if now - t < 3600)
        daily_used = sum(1 for t in self.usage[platform]['daily'] if now - t < 86400)
        return hourly_used < self.platform_limits[platform]['per_hour'] and daily_used < self.platform_limits[platform]['per_day']

    def _get_hourly_remaining(self, platform):
        now = time.time()
        hourly_used = sum(1 for t in self.usage[platform]['hourly'] if now - t < 3600)
        return max(0, self.platform_limits[platform]['per_hour'] - hourly_used)

    def _get_daily_remaining(self, platform):
        now = time.time()
        daily_used = sum(1 for t in self.usage[platform]['daily'] if now - t < 86400)
        return max(0, self.platform_limits[platform]['per_day'] - daily_used)

    def _calculate_optimal_wait_time(self):
        now = time.time()
        min_wait_time = float('inf')
        for platform in self.platform_limits:
            hourly_sends = [t for t in self.usage[platform]['hourly'] if now - t < 3600]
            if hourly_sends:
                min_wait_time = min(min_wait_time, 3600 - (now - min(hourly_sends)))
            daily_sends = [t for t in self.usage[platform]['daily'] if now - t < 86400]
            if len(daily_sends) >= self.platform_limits[platform]['per_day'] and daily_sends:
                min_wait_time = min(min_wait_time, 86400 - (now - min(daily_sends)))
        return max(60.0, min_wait_time if min_wait_time != float('inf') else 60.0)

    def record_send(self, platform):
        if platform not in self.usage:
            return
        timestamp = time.time()
        self.usage[platform]['hourly'].append(timestamp)
        self.usage[platform]['daily'].append(timestamp)
        self._clean_old_entries(platform)
        self.metrics['total_sends'] += 1

    def _clean_old_entries(self, platform):
        now = time.time()
        self.usage[platform]['hourly'] = [t for t in self.usage[platform]['hourly'] if now - t < 3600]
        self.usage[platform]['daily'] = [t for t in self.usage[platform]['daily'] if now - t < 86400]

    def _reset_hourly_counters(self):
        for platform in self.usage:
            self.usage[platform]['hourly'] = []

    def _reset_daily_counters(self):
        for platform in self.usage:
            self.usage[platform]['daily'] = []

    def get_platform_status(self):
        status = {}
        for platform in self.platform_limits:
            status[platform] = {
                'hourly_used': sum(1 for t in self.usage[platform]['hourly'] if time.time() - t < 3600),
                'hourly_limit': self.platform_limits[platform]['per_hour'],
                'hourly_remaining': self._get_hourly_remaining(platform),
                'daily_used': sum(1 for t in self.usage[platform]['daily'] if time.time() - t < 86400),
                'daily_limit': self.platform_limits[platform]['per_day'],
                'daily_remaining': self._get_daily_remaining(platform),
                'hourly_percentage': (status[platform]['hourly_used'] / self.platform_limits[platform]['per_hour']) * 100 if self.platform_limits[platform]['per_hour'] > 0 else 0,
                'daily_percentage': (status[platform]['daily_used'] / self.platform_limits[platform]['per_day']) * 100 if self.platform_limits[platform]['per_day'] > 0 else 0,
                'available': self._check_platform_availability(platform)
            }
        return status

    def get_optimal_platform_sequence(self, num_messages):
        platforms_available = [(platform, min(self._get_hourly_remaining(platform), self._get_daily_remaining(platform))) for platform in self.platform_limits if self._check_platform_availability(platform) and min(self._get_hourly_remaining(platform), self._get_daily_remaining(platform)) > 0]
        platforms_available.sort(key=lambda x: x[1], reverse=True)
        sequence = []
        for _ in range(num_messages):
            if not platforms_available:
                break
            platform, remaining = platforms_available[0]
            sequence.append(platform)
            platforms_available[0] = (platform, remaining - 1)
            platforms_available = [p for p in platforms_available if p[1] > 0]
            platforms_available.sort(key=lambda x: x[1], reverse=True)
        return sequence

    def adaptive_sleep(self, platform):
        if platform not in self.platform_limits:
            return 2.0
        hourly_percentage = (sum(1 for t in self.usage[platform]['hourly'] if time.time() - t < 3600) / self.platform_limits[platform]['per_hour']) * 100 if self.platform_limits[platform]['per_hour'] > 0 else 0
        if hourly_percentage >= 90:
            sleep_time = random.uniform(5.0, 10.0)
        elif hourly_percentage >= 70:
            sleep_time = random.uniform(3.0, 7.0)
        elif hourly_percentage >= 50:
            sleep_time = random.uniform(2.0, 4.0)
        else:
            sleep_time = random.uniform(1.0, 3.0)
        sleep_time += random.uniform(-0.5, 0.5)
        return max(1.0, sleep_time)

class AdaptiveAutoMessenger:
    def __init__(self, mode=CampaignMode.BALANCED):
        self.mode = mode
        self.rate_limiter = IntelligentRateLimiter()
        self.metrics = {"sent": 0, "failed": 0, "responses": 0, "platform_usage": {}, "rotation_count": 0}
        self.platform_configs = {
            'email': {'priority': 1, 'retry_attempts': 3, 'timeout': 30, 'min_sleep': 2.0, 'max_sleep': 5.0},
            'linkedin': {'priority': 2, 'retry_attempts': 2, 'timeout': 20, 'min_sleep': 3.0, 'max_sleep': 8.0},
            'twitter': {'priority': 3, 'retry_attempts': 2, 'timeout': 15, 'min_sleep': 2.0, 'max_sleep': 6.0},
            'reddit': {'priority': 4, 'retry_attempts': 1, 'timeout': 25, 'min_sleep': 4.0, 'max_sleep': 10.0},
            'facebook': {'priority': 5, 'retry_attempts': 2, 'timeout': 20, 'min_sleep': 3.0, 'max_sleep': 7.0},
            'instagram': {'priority': 6, 'retry_attempts': 1, 'timeout': 15, 'min_sleep': 4.0, 'max_sleep': 8.0},
            'github': {'priority': 7, 'retry_attempts': 2, 'timeout': 25, 'min_sleep': 2.0, 'max_sleep': 5.0},
            'producthunt': {'priority': 8, 'retry_attempts': 1, 'timeout': 20, 'min_sleep': 3.0, 'max_sleep': 6.0},
            'medium': {'priority': 9, 'retry_attempts': 2, 'timeout': 20, 'min_sleep': 2.0, 'max_sleep': 5.0},
            'quora': {'priority': 10, 'retry_attempts': 2, 'timeout': 25, 'min_sleep': 3.0, 'max_sleep': 7.0},
            'hackernews': {'priority': 11, 'retry_attempts': 1, 'timeout': 15, 'min_sleep': 4.0, 'max_sleep': 8.0},
            'stackoverflow': {'priority': 12, 'retry_attempts': 2, 'timeout': 20, 'min_sleep': 2.0, 'max_sleep': 5.0}
        }

    async def send_with_rotation(self, lead, message, campaign):
        max_attempts = 3
        attempts = 0
        while attempts < max_attempts:
            attempts += 1
            platform_info = self.rate_limiter.get_next_available_platform()
            if not platform_info['available']:
                wait_time = platform_info['wait_time']
                logger.info(f"All platforms at capacity. Waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
                continue
            platform = platform_info['platform']
            try:
                sleep_time = self.rate_limiter.adaptive_sleep(platform)
                await asyncio.sleep(sleep_time)
                result = await asyncio.wait_for(self._send_to_platform(platform, lead, message, campaign), timeout=self.platform_configs[platform]['timeout'])
                if result['success']:
                    self.rate_limiter.record_send(platform)
                    self.metrics["sent"] += 1
                    self.metrics["platform_usage"][platform] = self.metrics["platform_usage"].get(platform, 0) + 1
                    lead.contacted = True
                    lead.platform = Platform[platform.upper()] if platform.upper() in Platform.__members__ else Platform.GENERIC
                    return {**result, "platform": platform, "attempts": attempts, "sleep_time": sleep_time, "hourly_remaining": platform_info['hourly_remaining'], "daily_remaining": platform_info['daily_remaining']}
                else:
                    self.metrics["failed"] += 1
                    logger.error(f"Failed to send via {platform}: {result.get('error')}")
                    if result.get('error_type') in ['rate_limit', 'platform_error']:
                        self.rate_limiter.current_platform_index = (self.rate_limiter.current_platform_index + 1) % len(self.rate_limiter.rotation_schedule)
                        self.metrics["rotation_count"] += 1
                    await asyncio.sleep(random.uniform(5, 15))
            except asyncio.TimeoutError:
                self.metrics["failed"] += 1
                logger.error(f"Timeout sending via {platform}")
                await asyncio.sleep(random.uniform(10, 30))
            except Exception as e:
                self.metrics["failed"] += 1
                logger.error(f"Error sending via {platform}: {str(e)}")
                await asyncio.sleep(random.uniform(10, 30))
        return {"success": False, "error": f"Failed after {max_attempts} attempts", "platform": None, "attempts": attempts}

    async def _send_to_platform(self, platform, lead, message, campaign):
        # Implement actual sending logic for each platform here
        # Example for email (use smtplib or API)
        # For security, use secure connections, validate inputs
        return {'success': True, 'message_id': f"{platform}_{time.time()}", 'timestamp': time.time()}  # Placeholder

    def get_daily_schedule(self, num_messages):
        schedule = []
        platform_status = self.rate_limiter.get_platform_status()
        platform_allocations = {}
        total_remaining_capacity = 0
        for platform, status in platform_status.items():
            if status['available']:
                remaining = min(status['hourly_remaining'], status['daily_remaining'])
                if remaining > 0:
                    platform_allocations[platform] = remaining
                    total_remaining_capacity += remaining
        if total_remaining_capacity == 0:
            return []
        for platform, capacity in platform_allocations.items():
            allocated = min(capacity, int((capacity / total_remaining_capacity) * num_messages) if total_remaining_capacity > 0 else 0)
            if allocated > 0:
                schedule.append({
                    "platform": platform,
                    "message_count": allocated,
                    "hourly_remaining": platform_status[platform]['hourly_remaining'],
                    "daily_remaining": platform_status[platform]['daily_remaining'],
                    "estimated_time": allocated * self.rate_limiter.adaptive_sleep(platform)
                })
        schedule.sort(key=lambda x: self.platform_configs.get(x['platform'], {}).get('priority', 99))
        return schedule

    def print_system_status(self):
        platform_status = self.rate_limiter.get_platform_status()
        print("\n" + "="*80)
        print("🔄 INTELLIGENT PLATFORM ROTATION SYSTEM - STATUS")
        print("="*80)
        print(f"\n📊 Platform Capacity Status:")
        print("-" * 80)
        for platform, status in platform_status.items():
            hourly_bar = "█" * int(status['hourly_percentage'] / 5) + "░" * (20 - int(status['hourly_percentage'] / 5))
            daily_bar = "█" * int(status['daily_percentage'] / 5) + "░" * (20 - int(status['daily_percentage'] / 5))
            print(f"{platform.upper():12} [Hourly: {status['hourly_used']:3d}/{status['hourly_limit']:3d}] {hourly_bar} {status['hourly_percentage']:5.1f}%")
            print(f"{'':12} [Daily: {status['daily_used']:3d}/{status['daily_limit']:3d}] {daily_bar} {status['daily_percentage']:5.1f}%")
            print(f"{'':12} Status: {'🟢 AVAILABLE' if status['available'] else '🔴 FULL'}")
            print("-" * 80)
        print(f"\n📈 System Metrics:")
        print(f" • Total Sends: {self.metrics['sent']}")
        print(f" • Failed Sends: {self.metrics['failed']}")
        print(f" • Platform Rotations: {self.metrics['rotation_count']}")
        if self.metrics['sent'] > 0:
            success_rate = (self.metrics['sent'] / (self.metrics['sent'] + self.metrics['failed'])) * 100
            print(f" • Success Rate: {success_rate:.1f}%")
        print(f"\n🔄 Current Rotation Schedule:")
        current_idx = self.rate_limiter.current_platform_index
        next_platforms = self.rate_limiter.rotation_schedule[current_idx:current_idx+5]
        print(f" Next platforms: {', '.join(next_platforms)}")
        print("\n" + "="*80)

    def create_message(self, lead, analysis, campaign):
        hook = analysis.get('suggested_hook', '')
        message_draft = f"""
        Hello,
        
        {hook}
        
        Our product features: {campaign.usp}
        
        For more details, visit: {campaign.product_link}
        
        Original source: {lead.url}
        
        Best regards,
        Team {campaign.name}
        """
        return message_draft

class QuantumMarketingSystem:
    def __init__(self, supabase_url, supabase_key, google_api_key, google_cx):
        self.db = SupabaseClient(supabase_url, supabase_key)
        self.processor = NeuralEngine()
        self.hunter = CyberHunter(google_api_key, google_cx)
        self.results = {
            "total_leads": 0,
            "high_intent": 0,
            "contacted": 0,
            "responses": 0,
            "estimated_value": 0,
            "campaigns": []
        }

class QuantumMarketingSystemV2(QuantumMarketingSystem):
    def __init__(self, supabase_url, supabase_key, google_api_key, google_cx):
        super().__init__(supabase_url, supabase_key, google_api_key, google_cx)
        self.messenger = AdaptiveAutoMessenger()

    async def execute_campaign(self, campaign):
        logger.info(f"Executing Campaign: {campaign.name}")
        self.messenger.print_system_status()
        campaign_results = {
            "campaign_id": campaign.id,
            "name": campaign.name,
            "leads_found": 0,
            "high_intent": 0,
            "messages_sent": 0,
            "responses": 0,
            "platform_distribution": {},
            "leads": []
        }
        all_leads = []
        for platform in campaign.platforms:
            leads = await self.hunter.scan_platform(platform, ' '.join(campaign.keywords), campaign.max_leads)
            all_leads.extend(leads)
        campaign_results["leads_found"] = len(all_leads)
        self.results["total_leads"] += len(all_leads)
        high_intent_leads = []
        for lead in all_leads:
            analysis = self.processor.analyze_intent(lead)
            lead.intent_score = analysis["score"]
            if analysis["score"] >= campaign.filters.get("min_intent_score", 75) and analysis["action"] == "CONTACT":
                high_intent_leads.append((lead, analysis))
        campaign_results["high_intent"] = len(high_intent_leads)
        self.results["high_intent"] += len(high_intent_leads)
        if campaign.auto_send and high_intent_leads:
            num_to_send = min(len(high_intent_leads), campaign.max_targets)
            schedule = self.messenger.get_daily_schedule(num_to_send)
            # Logging schedule
            messages_sent = 0
            for idx, (lead, analysis) in enumerate(high_intent_leads[:num_to_send]):
                message = self.messenger.create_message(lead, analysis, campaign)
                result = await self.messenger.send_with_rotation(lead, message, campaign)
                if result.get("success"):
                    messages_sent += 1
                    campaign_results["messages_sent"] = messages_sent
                    platform = result["platform"]
                    campaign_results["platform_distribution"][platform] = campaign_results["platform_distribution"].get(platform, 0) + 1
                    lead_payload = {
                        "campaign_id": campaign.id,
                        "url": lead.url,
                        "intent_score": lead.intent_score,
                        "ai_analysis_text": analysis["reason"],
                        "message_draft": message,
                        "status": "sent" if result["success"] else "failed"
                    }
                    self.db.store_lead(lead_payload)
                    campaign_results["leads"].append(lead_payload)
                    if random.random() > 0.6:  # Simulate response
                        campaign_results["responses"] += 1
                        self.results["responses"] += 1
                if (idx + 1) % 10 == 0:
                    self.messenger.print_system_status()
            self.results["contacted"] += messages_sent
        estimated_value = campaign_results["responses"] * 25
        campaign_results["estimated_value"] = estimated_value
        self.results["estimated_value"] += estimated_value
        self.results["campaigns"].append(campaign_results)
        self.messenger.print_system_status()
        return campaign_results

async def main():
    # Load from env or config
    SUPABASE_URL = "https://your-supabase-url.supabase.co"
    SUPABASE_KEY = "your-supabase-key"
    GOOGLE_API_KEY = "your-google-api-key"
    GOOGLE_CX = "your-cx"
    system = QuantumMarketingSystemV2(SUPABASE_URL, SUPABASE_KEY, GOOGLE_API_KEY, GOOGLE_CX)
    campaigns = system.db.fetch_campaigns()
    for campaign in campaigns:
        await system.execute_campaign(campaign)

if __name__ == "__main__":
    asyncio.run(main())
