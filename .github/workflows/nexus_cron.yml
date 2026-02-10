# nexus_prime_smart.py
import os
import sys
import json
import uuid
import asyncio
import logging
import aiohttp
import smtplib
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse
from supabase import create_client
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('nexus_prime_smart.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GOOGLE_CX = os.getenv('GOOGLE_CX')
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
TWITTER_API_KEY = os.getenv('TWITTER_API_KEY')
TWITTER_API_SECRET = os.getenv('TWITTER_API_SECRET')
TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN')
TWITTER_ACCESS_SECRET = os.getenv('TWITTER_ACCESS_SECRET')

class Platform:
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    EMAIL = "email"
    GITHUB = "github"
    GENERIC = "generic"

class LeadStatus:
    NEW = "new"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    FAILED = "failed"

class CampaignStatus:
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

class Lead:
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.campaign_id = ""
        self.url = ""
        self.platform = Platform.GENERIC
        self.name = ""
        self.email = ""
        self.company = ""
        self.job_title = ""
        self.location = ""
        self.intent_score = 0.0
        self.content_summary = ""
        self.contact_info = {}
        self.status = LeadStatus.NEW
        self.message_sent = False
        self.response_received = False
        self.message_content = ""
        self.message_response = ""
        self.created_at = datetime.now()
        self.last_contacted = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'url': self.url,
            'platform': self.platform,
            'name': self.name,
            'email': self.email,
            'company': self.company,
            'job_title': self.job_title,
            'location': self.location,
            'intent_score': float(self.intent_score),
            'content_summary': str(self.content_summary[:500]),
            'contact_info': json.dumps(self.contact_info),
            'status': self.status,
            'message_sent': bool(self.message_sent),
            'response_received': bool(self.response_received),
            'message_content': str(self.message_content[:1000]),
            'message_response': str(self.message_response[:500]),
            'created_at': self.created_at.isoformat(),
            'last_contacted': self.last_contacted.isoformat() if self.last_contacted else None
        }

class Campaign:
    def __init__(self):
        self.id = ""
        self.name = ""
        self.keywords = []
        self.usp = ""
        self.product_link = ""
        self.product_name = ""
        self.company_name = ""
        self.target_platforms = []
        self.max_leads = 100
        self.min_intent_score = 70.0
        self.status = CampaignStatus.ACTIVE
        self.messaging_tone = "professional"
        self.signature = "Best regards,\n[Your Name]"
    
    @classmethod
    def from_db(cls, data: Dict):
        campaign = cls()
        campaign.id = str(data.get('id', ''))
        campaign.name = str(data.get('name', ''))
        
        keywords_str = str(data.get('keywords', ''))
        campaign.keywords = [k.strip() for k in keywords_str.split(',') if k.strip()]
        
        campaign.usp = str(data.get('usp', ''))
        campaign.product_link = str(data.get('product_link', ''))
        campaign.product_name = str(data.get('product_name', campaign.name))
        campaign.company_name = str(data.get('company_name', ''))
        
        platforms_str = str(data.get('target_platforms', ''))
        campaign.target_platforms = [p.strip() for p in platforms_str.split(',') if p.strip()]
        
        campaign.max_leads = int(data.get('max_leads', 100))
        campaign.min_intent_score = float(data.get('min_intent_score', 70.0))
        campaign.status = str(data.get('status', CampaignStatus.ACTIVE))
        campaign.messaging_tone = str(data.get('messaging_tone', 'professional'))
        campaign.signature = str(data.get('signature', 'Best regards,\n[Your Name]'))
        
        return campaign

class DatabaseService:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Supabase credentials not set")
        
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Database connected")
    
    def get_active_campaigns(self) -> List[Campaign]:
        try:
            res = self.client.table('campaigns').select('*').eq('status', 'active').execute()
            return [Campaign.from_db(row) for row in res.data]
        except Exception as e:
            logger.error(f"Get campaigns error: {e}")
            return []
    
    def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        try:
            res = self.client.table('campaigns').select('*').eq('id', campaign_id).execute()
            if res.data:
                return Campaign.from_db(res.data[0])
            return None
        except Exception as e:
            logger.error(f"Get campaign error: {e}")
            return None
    
    def insert_lead(self, lead: Lead) -> bool:
        try:
            self.client.table('leads').insert(lead.to_dict()).execute()
            return True
        except Exception as e:
            logger.error(f"Insert lead error: {e}")
            return False
    
    def update_lead(self, lead: Lead) -> bool:
        try:
            lead_dict = lead.to_dict()
            lead_id = lead_dict.pop('id')
            lead_dict['updated_at'] = datetime.now().isoformat()
            
            self.client.table('leads').update(lead_dict).eq('id', lead_id).execute()
            return True
        except Exception as e:
            logger.error(f"Update lead error: {e}")
            return False
    
    def get_campaign_stats(self, campaign_id: str) -> Dict:
        try:
            res = self.client.table('leads').select('*').eq('campaign_id', campaign_id).execute()
            leads = res.data
            total = len(leads)
            contacted = sum(1 for lead in leads if lead.get('message_sent', False))
            converted = sum(1 for lead in leads if lead.get('status') == LeadStatus.CONVERTED)
            responded = sum(1 for lead in leads if lead.get('response_received', False))
            
            conversion_rate = 0
            response_rate = 0
            if total > 0:
                conversion_rate = (converted / total) * 100
            if contacted > 0:
                response_rate = (responded / contacted) * 100
            
            return {
                'total_leads': total,
                'contacted_leads': contacted,
                'converted_leads': converted,
                'responded_leads': responded,
                'conversion_rate': round(conversion_rate, 2),
                'response_rate': round(response_rate, 2)
            }
        except Exception as e:
            logger.error(f"Get stats error: {e}")
            return {}
    
    def update_campaign_status(self, campaign_id: str, status: str):
        try:
            self.client.table('campaigns').update({'status': status}).eq('id', campaign_id).execute()
        except Exception as e:
            logger.error(f"Update campaign error: {e}")

class IntentAnalyzer:
    def __init__(self):
        self.classifier = None
        try:
            from transformers import pipeline
            self.classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
            logger.info("Intent analyzer initialized with BART")
        except Exception as e:
            logger.warning(f"Transformers not available: {e}")
    
    def analyze(self, text: str, context: Dict = None) -> Dict:
        if not text or len(text.strip()) < 10:
            return self._get_default_analysis()
        
        analysis = {
            'intent_score': 0.0,
            'sentiment': 'neutral',
            'urgency_level': 'low',
            'keywords': [],
            'needs': []
        }
        
        if self.classifier:
            return self._analyze_with_ai(text, context)
        else:
            return self._analyze_with_rules(text, context)
    
    def _analyze_with_ai(self, text: str, context: Dict = None) -> Dict:
        try:
            labels = [
                "looking to purchase immediately",
                "researching options to buy",
                "has a problem needing solution",
                "comparing different products",
                "just browsing with no intent",
                "seeking recommendations",
                "complaining about current solution"
            ]
            
            result = self.classifier(text[:500], labels)
            top_label = result['labels'][0]
            top_score = result['scores'][0] * 100
            
            # Map labels to scores
            intent_mapping = {
                "looking to purchase immediately": 90,
                "researching options to buy": 75,
                "has a problem needing solution": 80,
                "comparing different products": 65,
                "seeking recommendations": 60,
                "just browsing with no intent": 30,
                "complaining about current solution": 70
            }
            
            intent_score = intent_mapping.get(top_label, 50)
            
            # Adjust based on text length and content
            if len(text) > 200:
                intent_score = min(100, intent_score + 5)
            
            # Extract keywords
            keywords = self._extract_keywords(text)
            
            # Detect needs
            needs = self._detect_needs(text)
            
            # Determine sentiment
            sentiment = self._detect_sentiment(text)
            
            # Determine urgency
            urgency = self._detect_urgency(text)
            
            return {
                'intent_score': float(intent_score),
                'confidence': float(top_score),
                'primary_intent': top_label,
                'sentiment': sentiment,
                'urgency_level': urgency,
                'keywords': keywords[:5],
                'needs': needs[:3]
            }
            
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            return self._analyze_with_rules(text, context)
    
    def _analyze_with_rules(self, text: str, context: Dict = None) -> Dict:
        text_lower = text.lower()
        
        # Keyword scoring
        intent_keywords = {
            'buy': 85, 'purchase': 85, 'order': 80, 'need': 75,
            'looking for': 70, 'want': 65, 'require': 75, 'must have': 80,
            'problem': 70, 'issue': 65, 'pain': 70, 'challenge': 60,
            'solution': 75, 'fix': 70, 'help': 65, 'assist': 60,
            'compare': 60, 'research': 55, 'review': 50, 'browse': 30
        }
        
        max_score = 0
        detected_keywords = []
        
        for keyword, score in intent_keywords.items():
            if keyword in text_lower:
                max_score = max(max_score, score)
                detected_keywords.append(keyword)
        
        if max_score == 0:
            max_score = 40 if len(text) > 100 else 20
        
        # Adjust based on questions
        if '?' in text:
            max_score = min(100, max_score + 10)
        
        # Adjust based on contact info mention
        if any(word in text_lower for word in ['contact', 'email', 'call', 'reach']):
            max_score = min(100, max_score + 15)
        
        # Detect needs
        needs = []
        if 'cost' in text_lower or 'price' in text_lower or 'budget' in text_lower:
            needs.append('pricing_info')
        if 'time' in text_lower or 'when' in text_lower or 'soon' in text_lower:
            needs.append('timeline')
        if 'how' in text_lower or 'work' in text_lower or 'function' in text_lower:
            needs.append('how_it_works')
        if 'compare' in text_lower or 'vs' in text_lower or 'alternative' in text_lower:
            needs.append('comparison')
        
        # Detect sentiment
        positive_words = ['great', 'good', 'excellent', 'amazing', 'love', 'happy']
        negative_words = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated']
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            sentiment = 'positive'
        elif negative_count > positive_count:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        # Detect urgency
        urgency_words = ['asap', 'urgent', 'immediate', 'now', 'today', 'quick']
        urgency_level = 'high' if any(word in text_lower for word in urgency_words) else 'low'
        
        return {
            'intent_score': float(max_score),
            'confidence': 0.7,
            'primary_intent': 'rule_based_analysis',
            'sentiment': sentiment,
            'urgency_level': urgency_level,
            'keywords': detected_keywords[:5],
            'needs': needs[:3]
        }
    
    def _extract_keywords(self, text: str) -> List[str]:
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any'}
        filtered = [w for w in words if w not in stop_words]
        
        from collections import Counter
        word_counts = Counter(filtered)
        return [word for word, _ in word_counts.most_common(10)]
    
    def _detect_needs(self, text: str) -> List[str]:
        text_lower = text.lower()
        needs = []
        
        if any(word in text_lower for word in ['price', 'cost', 'afford', 'budget']):
            needs.append('budget_conscious')
        if any(word in text_lower for word in ['fast', 'quick', 'time', 'urgent']):
            needs.append('time_sensitive')
        if any(word in text_lower for word in ['quality', 'best', 'premium', 'excellent']):
            needs.append('quality_focused')
        if any(word in text_lower for word in ['easy', 'simple', 'convenient', 'user-friendly']):
            needs.append('ease_of_use')
        if any(word in text_lower for word in ['feature', 'function', 'capability', 'do']):
            needs.append('feature_specific')
        
        return needs
    
    def _detect_sentiment(self, text: str) -> str:
        positive = ['great', 'good', 'excellent', 'amazing', 'love', 'happy', 'perfect']
        negative = ['bad', 'terrible', 'awful', 'hate', 'poor', 'disappointed']
        
        text_lower = text.lower()
        pos_count = sum(1 for word in positive if word in text_lower)
        neg_count = sum(1 for word in negative if word in text_lower)
        
        if pos_count > neg_count:
            return 'positive'
        elif neg_count > pos_count:
            return 'negative'
        else:
            return 'neutral'
    
    def _detect_urgency(self, text: str) -> str:
        urgent_words = ['asap', 'urgent', 'immediate', 'now', 'today', 'quickly', 'emergency']
        if any(word in text.lower() for word in urgent_words):
            return 'high'
        return 'low'
    
    def _get_default_analysis(self) -> Dict:
        return {
            'intent_score': 0.0,
            'confidence': 0.0,
            'primary_intent': 'insufficient_data',
            'sentiment': 'neutral',
            'urgency_level': 'low',
            'keywords': [],
            'needs': []
        }

class ContentScraper:
    def __init__(self):
        self.session = None
    
    async def scrape(self, url: str) -> Dict:
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
                
                async with session.get(url, headers=headers, timeout=15, ssl=False) as response:
                    html = await response.text()
                    return self._extract_data(html, url)
        except Exception as e:
            logger.error(f"Scrape error for {url}: {e}")
            return self._get_empty_data(url)
    
    def _extract_data(self, html: str, url: str) -> Dict:
        data = {
            'url': url,
            'content': '',
            'platform': Platform.GENERIC,
            'title': '',
            'author': '',
            'email': '',
            'phone': '',
            'company': '',
            'job_title': '',
            'location': '',
            'social_links': [],
            'contact_info': {}
        }
        
        # Detect platform
        url_lower = url.lower()
        for platform in [Platform.TWITTER, Platform.LINKEDIN, Platform.GITHUB]:
            if platform in url_lower:
                data['platform'] = platform
                break
        
        # Extract text content
        text = re.sub(r'<[^>]+>', ' ', html)
        text = re.sub(r'\s+', ' ', text)
        data['content'] = text[:3000]
        
        # Extract title
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE)
        if title_match:
            data['title'] = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()[:200]
        
        # Extract author/name from URL
        parsed = urlparse(url)
        path_parts = parsed.path.strip('/').split('/')
        if path_parts:
            username = path_parts[0]
            data['author'] = username.replace('-', ' ').replace('_', ' ').title()
            data['name'] = data['author']
        
        # Extract contact information
        data.update(self._extract_contact_info(html))
        
        # Extract company/job from LinkedIn patterns
        if data['platform'] == Platform.LINKEDIN:
            self._extract_linkedin_info(html, data)
        
        return data
    
    def _extract_contact_info(self, html: str) -> Dict:
        info = {
            'email': '',
            'phone': '',
            'company': '',
            'job_title': '',
            'location': '',
            'social_links': [],
            'website': ''
        }
        
        # Extract emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, html, re.IGNORECASE)
        if emails:
            info['email'] = emails[0]
        
        # Extract phones
        phone_patterns = [
            r'\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
            r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}',
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, html)
            if phones:
                info['phone'] = phones[0]
                break
        
        # Extract social links
        social_patterns = {
            'linkedin': r'linkedin\.com/in/([A-Za-z0-9-]+)',
            'twitter': r'(?:twitter\.com|x\.com)/([A-Za-z0-9_]+)',
            'github': r'github\.com/([A-Za-z0-9-]+)',
            'facebook': r'facebook\.com/([A-Za-z0-9.]+)',
            'instagram': r'instagram\.com/([A-Za-z0-9._]+)'
        }
        
        social_links = []
        for platform, pattern in social_patterns.items():
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                social_links.append(f"{platform}:{matches[0]}")
        
        info['social_links'] = social_links
        
        # Extract website
        website_pattern = r'(?:href|src)="(https?://[^"/]+(?:/[^"]*)?)"'
        websites = re.findall(website_pattern, html)
        if websites:
            for website in websites[:3]:
                if not any(domain in website for domain in ['twitter.com', 'facebook.com', 'linkedin.com', 'github.com']):
                    info['website'] = website
                    break
        
        return info
    
    def _extract_linkedin_info(self, html: str, data: Dict):
        # Try to extract LinkedIn profile info
        patterns = {
            'company': r'(?:company|works at|at)\s*(?:<[^>]+>)*([^<,]+)',
            'job_title': r'(?:title|position|role)[^>]*>([^<]+)',
            'location': r'(?:location|located in|based in)[^>]*>([^<]+)'
        }
        
        for field, pattern in patterns.items():
            matches = re.search(pattern, html, re.IGNORECASE)
            if matches and field not in data or not data[field]:
                data[field] = matches.group(1).strip()[:100]
    
    def _get_empty_data(self, url: str) -> Dict:
        return {
            'url': url,
            'content': '',
            'platform': Platform.GENERIC,
            'title': '',
            'author': '',
            'email': '',
            'phone': '',
            'company': '',
            'job_title': '',
            'location': '',
            'social_links': [],
            'contact_info': {}
        }

class MessageGenerator:
    def __init__(self):
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict:
        return {
            'email': {
                'high_intent': self._high_intent_email,
                'medium_intent': self._medium_intent_email,
                'low_intent': self._low_intent_email,
                'problem_solution': self._problem_solution_email
            },
            'twitter': {
                'high_intent': self._high_intent_twitter,
                'medium_intent': self._medium_intent_twitter,
                'low_intent': self._low_intent_twitter
            },
            'linkedin': {
                'professional': self._linkedin_professional,
                'casual': self._linkedin_casual
            }
        }
    
    def generate_message(self, lead: Lead, campaign: Campaign, analysis: Dict) -> str:
        platform = lead.platform
        intent_score = analysis.get('intent_score', 0)
        
        if platform == Platform.EMAIL:
            return self._generate_email_message(lead, campaign, analysis, intent_score)
        elif platform == Platform.TWITTER:
            return self._generate_twitter_message(lead, campaign, analysis, intent_score)
        elif platform == Platform.LINKEDIN:
            return self._generate_linkedin_message(lead, campaign, analysis, intent_score)
        else:
            return self._generate_generic_message(lead, campaign, analysis)
    
    def _generate_email_message(self, lead: Lead, campaign: Campaign, analysis: Dict, intent_score: float) -> str:
        if intent_score >= 80:
            template_type = 'high_intent'
        elif intent_score >= 60:
            template_type = 'medium_intent'
        else:
            template_type = 'low_intent'
        
        # Check if problem-solution pattern
        if 'problem' in str(analysis.get('keywords', [])) or 'issue' in str(analysis.get('needs', [])):
            template_type = 'problem_solution'
        
        template_func = self.templates['email'].get(template_type, self._medium_intent_email)
        return template_func(lead, campaign, analysis)
    
    def _high_intent_email(self, lead: Lead, campaign: Campaign, analysis: Dict) -> str:
        subject = f"Regarding {campaign.product_name}"
        
        if lead.name:
            greeting = f"Hi {lead.name},"
        else:
            greeting = f"Hi there,"
        
        intro = "I came across your recent activity and noticed you're actively looking for solutions in this space."
        
        personalization = ""
        if lead.company:
            personalization = f" I see you're with {lead.company}"
            if lead.job_title:
                personalization += f" as a {lead.job_title}"
            personalization += "."
        
        value_prop = f"Our {campaign.product_name} {campaign.usp}"
        
        if analysis.get('needs'):
            needs_text = self._address_needs(analysis['needs'])
            value_prop += f" {needs_text}"
        
        call_to_action = f"You can check it out here: {campaign.product_link}"
        
        closing = "I'd be happy to schedule a quick call to discuss how we can help you achieve your goals."
        
        signature = campaign.signature
        
        message = f"""{greeting}

{intro}{personalization}

{value_prop}

{call_to_action}

{closing}

{signature}"""
        
        return f"Subject: {subject}\n\n{message}"
    
    def _medium_intent_email(self, lead: Lead, campaign: Campaign, analysis: Dict) -> str:
        subject = f"Thought you might be interested in {campaign.product_name}"
        
        if lead.name:
            greeting = f"Hello {lead.name},"
        else:
            greeting = f"Hello,"
        
        intro = "I noticed your interest in this area and thought our solution might be relevant to you."
        
        personalization = ""
        if lead.job_title:
            personalization = f" As a {lead.job_title},"
        
        value_prop = f"Our {campaign.product_name} helps professionals like you {campaign.usp.lower()}"
        
        if analysis.get('keywords'):
            keywords_text = ", ".join(analysis['keywords'][:3])
            value_prop += f", especially when it comes to {keywords_text}."
        
        call_to_action = f"Learn more here: {campaign.product_link}"
        
        closing = "Feel free to reply if you have any questions!"
        
        signature = campaign.signature
        
        message = f"""{greeting}

{intro}{personalization}

{value_prop}

{call_to_action}

{closing}

{signature}"""
        
        return f"Subject: {subject}\n\n{message}"
    
    def _problem_solution_email(self, lead: Lead, campaign: Campaign, analysis: Dict) -> str:
        subject = f"A solution for your {analysis.get('needs', ['challenges'])[0]}"
        
        greeting = f"Hi {lead.name if lead.name else 'there'},"
        
        intro = "I understand you might be facing some challenges in this area."
        
        empathy = "Many professionals encounter similar issues, and I wanted to share a potential solution."
        
        solution = f"Our {campaign.product_name} specifically addresses these challenges by {campaign.usp.lower()}"
        
        proof = "We've helped others in similar situations achieve [specific result]."
        
        call_to_action = f"See how it works: {campaign.product_link}"
        
        offer = "I'm available for a quick 15-minute chat to discuss your specific situation."
        
        signature = campaign.signature
        
        message = f"""{greeting}

{intro}

{empathy}

{solution}

{proof}

{call_to_action}

{offer}

{signature}"""
        
        return f"Subject: {subject}\n\n{message}"
    
    def _generate_twitter_message(self, lead: Lead, campaign: Campaign, analysis: Dict, intent_score: float) -> str:
        if intent_score >= 70:
            template = self.templates['twitter']['high_intent']
        elif intent_score >= 50:
            template = self.templates['twitter']['medium_intent']
        else:
            template = self.templates['twitter']['low_intent']
        
        message = template(lead, campaign, analysis)
        
        # Ensure Twitter length limit
        if len(message) > 280:
            message = message[:275] + "..."
        
        return message
    
    def _high_intent_twitter(self, lead: Lead, campaign: Campaign, analysis: Dict) -> str:
        handle = f"@{lead.name}" if lead.name and '@' not in lead.name else ""
        
        return f"""Hi{handle}! Saw you're looking into solutions for {analysis.get('keywords', ['this'])[0]}. 

Our {campaign.product_name} {campaign.usp} 

Check it out: {campaign.product_link} 

DM me if you'd like to discuss!"""
    
    def _address_needs(self, needs: List[str]) -> str:
        need_mapping = {
            'pricing_info': "with transparent pricing",
            'timeline': "with quick implementation",
            'how_it_works': "that's easy to understand and use",
            'comparison': "that outperforms alternatives",
            'budget_conscious': "at an affordable price",
            'time_sensitive': "that delivers fast results",
            'quality_focused': "with premium quality",
            'ease_of_use': "that's user-friendly",
            'feature_specific': "with powerful features"
        }
        
        addressed_needs = []
        for need in needs[:2]:
            if need in need_mapping:
                addressed_needs.append(need_mapping[need])
        
        if addressed_needs:
            return " specifically designed " + " and ".join(addressed_needs)
        return ""

class EmailSender:
    def __init__(self):
        self.sent_count = 0
        self.failed_count = 0
    
    def send(self, to_email: str, subject: str, body: str, from_email: str = None) -> Tuple[bool, str]:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.warning("SMTP credentials not set. Email sending disabled.")
            return False, "SMTP credentials not configured"
        
        try:
            # Parse subject and body from the message
            lines = body.split('\n')
            actual_subject = subject
            actual_body = body
            
            if 'Subject:' in body:
                # Extract subject from body
                for i, line in enumerate(lines):
                    if line.lower().startswith('subject:'):
                        actual_subject = line.replace('Subject:', '').replace('subject:', '').strip()
                        actual_body = '\n'.join(lines[i+1:])
                        break
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = from_email or SMTP_USERNAME
            msg['To'] = to_email
            msg['Subject'] = actual_subject
            
            msg.attach(MIMEText(actual_body.strip(), 'plain'))
            
            # Send email
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
            
            self.sent_count += 1
            logger.info(f"Email sent successfully to {to_email}")
            return True, "Email sent successfully"
            
        except Exception as e:
            self.failed_count += 1
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False, str(e)

class SmartMessenger:
    def __init__(self):
        self.generator = MessageGenerator()
        self.email_sender = EmailSender()
        self.sent_count = 0
        self.failed_count = 0
    
    async def send_message(self, lead: Lead, campaign: Campaign, analysis: Dict) -> Tuple[bool, str, str]:
        logger.info(f"Preparing to send message to {lead.url}")
        
        try:
            # Generate personalized message
            message_content = self.generator.generate_message(lead, campaign, analysis)
            lead.message_content = message_content
            
            # Send based on platform
            if lead.platform == Platform.EMAIL and lead.email:
                success, response = self.email_sender.send(
                    to_email=lead.email,
                    subject=f"Regarding {campaign.product_name}",
                    body=message_content
                )
                
                if success:
                    lead.message_sent = True
                    lead.status = LeadStatus.CONTACTED
                    lead.last_contacted = datetime.now()
                    self.sent_count += 1
                    logger.info(f"✅ Message sent to {lead.email}")
                else:
                    lead.status = LeadStatus.FAILED
                    self.failed_count += 1
                    logger.error(f"❌ Failed to send to {lead.email}: {response}")
                
                return success, response, message_content[:200]
            
            elif lead.platform == Platform.TWITTER:
                # Twitter sending logic (placeholder)
                logger.info(f"[TWITTER] Would send to {lead.url}: {message_content[:100]}...")
                lead.message_sent = True
                lead.status = LeadStatus.CONTACTED
                lead.last_contacted = datetime.now()
                self.sent_count += 1
                return True, "Twitter message prepared", message_content[:200]
            
            elif lead.platform == Platform.LINKEDIN:
                # LinkedIn sending logic (placeholder)
                logger.info(f"[LINKEDIN] Would send to {lead.url}: {message_content[:100]}...")
                lead.message_sent = True
                lead.status = LeadStatus.CONTACTED
                lead.last_contacted = datetime.now()
                self.sent_count += 1
                return True, "LinkedIn message prepared", message_content[:200]
            
            else:
                logger.warning(f"No sending method for platform {lead.platform}")
                return False, f"Unsupported platform: {lead.platform}", ""
                
        except Exception as e:
            logger.error(f"Error in send_message: {e}")
            return False, str(e), ""
    
    def get_stats(self) -> Dict:
        return {
            'total_sent': self.sent_count,
            'total_failed': self.failed_count,
            'emails_sent': self.email_sender.sent_count,
            'emails_failed': self.email_sender.failed_count
        }

class LeadFinder:
    def __init__(self):
        self.session = None
    
    async def search(self, query: str, platforms: List[str], num_results: int = 20) -> List[str]:
        urls = []
        
        # Search each platform
        for platform in platforms:
            platform_urls = await self._search_platform(query, platform, num_results // len(platforms))
            urls.extend(platform_urls)
        
        # Deduplicate
        seen = set()
        unique_urls = []
        for url in urls:
            if url and url not in seen:
                seen.add(url)
                unique_urls.append(url)
        
        return unique_urls[:num_results]
    
    async def _search_platform(self, query: str, platform: str, num_results: int) -> List[str]:
        if platform == Platform.TWITTER:
            return await self._search_twitter(query, num_results)
        elif platform == Platform.LINKEDIN:
            return await self._search_linkedin(query, num_results)
        elif platform == Platform.GITHUB:
            return await self._search_github(query, num_results)
        else:
            return await self._search_google(query, platform, num_results)
    
    async def _search_google(self, query: str, platform: str, num_results: int) -> List[str]:
        if not GOOGLE_API_KEY or not GOOGLE_CX:
            return self._fallback_search(query, platform, num_results)
        
        try:
            platform_site = {
                Platform.TWITTER: "site:twitter.com OR site:x.com",
                Platform.LINKEDIN: "site:linkedin.com/in/",
                Platform.GITHUB: "site:github.com",
                Platform.EMAIL: "email"
            }.get(platform, "")
            
            search_query = f"{query} {platform_site}" if platform_site else query
            
            async with aiohttp.ClientSession() as session:
                url = "https://www.googleapis.com/customsearch/v1"
                params = {
                    'q': search_query,
                    'key': GOOGLE_API_KEY,
                    'cx': GOOGLE_CX,
                    'num': min(num_results, 10)
                }
                
                async with session.get(url, params=params, timeout=30) as response:
                    data = await response.json()
                    items = data.get('items', [])
                    return [item.get('link', '') for item in items if item.get('link')]
                    
        except Exception as e:
            logger.error(f"Google search error: {e}")
            return self._fallback_search(query, platform, num_results)
    
    async def _search_twitter(self, query: str, num_results: int) -> List[str]:
        # Use Google search for Twitter as fallback
        return await self._search_google(query, Platform.TWITTER, num_results)
    
    async def _search_linkedin(self, query: str, num_results: int) -> List[str]:
        # Use Google search for LinkedIn as fallback
        return await self._search_google(query, Platform.LINKEDIN, num_results)
    
    async def _search_github(self, query: str, num_results: int) -> List[str]:
        # Use Google search for GitHub as fallback
        return await self._search_google(query, Platform.GITHUB, num_results)
    
    def _fallback_search(self, query: str, platform: str, num_results: int) -> List[str]:
        # Generate sample URLs based on platform
        base_urls = {
            Platform.TWITTER: "https://twitter.com/user_{i}",
            Platform.LINKEDIN: "https://linkedin.com/in/profile-{i}",
            Platform.GITHUB: "https://github.com/dev-{i}",
            Platform.EMAIL: "https://example.com/contact-{i}"
        }
        
        base_url = base_urls.get(platform, "https://example.com/profile-{i}")
        return [base_url.format(i=i) for i in range(min(num_results, 5))]

class NexusPrimeSmart:
    def __init__(self):
        self.db = DatabaseService()
        self.analyzer = IntentAnalyzer()
        self.finder = LeadFinder()
        self.scraper = ContentScraper()
        self.messenger = SmartMessenger()
        self.processed_count = 0
    
    async def process_campaign(self, campaign_id: str) -> Dict:
        logger.info(f"🔍 Processing campaign: {campaign_id}")
        
        campaign = self.db.get_campaign(campaign_id)
        if not campaign:
            return {"error": "Campaign not found"}
        
        if campaign.status != CampaignStatus.ACTIVE:
            return {"error": "Campaign is not active"}
        
        logger.info(f"📋 Campaign: {campaign.name}")
        logger.info(f"🔑 Keywords: {', '.join(campaign.keywords)}")
        logger.info(f"🎯 Target platforms: {', '.join(campaign.target_platforms)}")
        
        # Use campaign platforms or default to Twitter and LinkedIn
        platforms = campaign.target_platforms or [Platform.TWITTER, Platform.LINKEDIN]
        
        query = " OR ".join(campaign.keywords)
        urls = await self.finder.search(query, platforms, campaign.max_leads)
        
        logger.info(f"📊 Found {len(urls)} potential leads")
        
        results = {
            "campaign_id": campaign_id,
            "campaign_name": campaign.name,
            "total_found": len(urls),
            "processed": 0,
            "qualified": 0,
            "sent": 0,
            "failed": 0,
            "leads": []
        }
        
        for url in urls[:campaign.max_leads]:
            try:
                # Scrape content
                scraped = await self.scraper.scrape(url)
                
                # Analyze intent
                analysis = self.analyzer.analyze(scraped['content'], scraped)
                intent_score = analysis.get('intent_score', 0)
                
                if intent_score >= campaign.min_intent_score:
                    # Create lead
                    lead = Lead()
                    lead.campaign_id = campaign.id
                    lead.url = url
                    lead.platform = scraped['platform']
                    lead.name = scraped.get('name', scraped.get('author', ''))
                    lead.email = scraped.get('email', '')
                    lead.company = scraped.get('company', '')
                    lead.job_title = scraped.get('job_title', '')
                    lead.location = scraped.get('location', '')
                    lead.intent_score = intent_score
                    lead.content_summary = scraped['content'][:500]
                    lead.contact_info = {
                        'email': scraped.get('email', ''),
                        'phone': scraped.get('phone', ''),
                        'social_links': scraped.get('social_links', [])
                    }
                    
                    # Send message
                    if lead.email or lead.platform in [Platform.TWITTER, Platform.LINKEDIN]:
                        success, response, message_preview = await self.messenger.send_message(
                            lead, campaign, analysis
                        )
                        
                        if success:
                            results["sent"] += 1
                            lead.message_sent = True
                            lead.status = LeadStatus.CONTACTED
                        else:
                            results["failed"] += 1
                            lead.status = LeadStatus.FAILED
                            lead.message_response = response
                        
                        # Save lead
                        if self.db.insert_lead(lead):
                            results["qualified"] += 1
                            results["leads"].append({
                                "url": url,
                                "score": intent_score,
                                "platform": scraped['platform'],
                                "sent": success,
                                "message_preview": message_preview
                            })
                            
                            logger.info(f"✅ Lead processed: {url} (Score: {intent_score})")
                
                results["processed"] += 1
                self.processed_count += 1
                
                await asyncio.sleep(2)  # Rate limiting
                
            except Exception as e:
                logger.error(f"Error processing {url}: {e}")
                await asyncio.sleep(3)
        
        # Update campaign if max leads reached
        stats = self.db.get_campaign_stats(campaign_id)
        if stats.get('total_leads', 0) >= campaign.max_leads:
            self.db.update_campaign_status(campaign_id, CampaignStatus.COMPLETED)
            logger.info(f"🎯 Campaign {campaign.name} completed")
        
        results["final_stats"] = stats
        results["messenger_stats"] = self.messenger.get_stats()
        return results
    
    async def process_all_active(self) -> List[Dict]:
        campaigns = self.db.get_active_campaigns()
        results = []
        
        logger.info(f"📈 Found {len(campaigns)} active campaigns")
        
        for campaign in campaigns:
            result = await self.process_campaign(campaign.id)
            results.append(result)
            await asyncio.sleep(10)  # Wait between campaigns
        
        return results
    
    def get_stats(self) -> Dict:
        messenger_stats = self.messenger.get_stats()
        return {
            "processed_total": self.processed_count,
            **messenger_stats
        }

def main_menu():
    print("\n" + "="*60)
    print("🚀 NEXUS-PRIME SMART - Intelligent Outreach System")
    print("="*60)
    print("1. Process all active campaigns")
    print("2. Process specific campaign")
    print("3. Show system statistics")
    print("4. Test email sending")
    print("5. Exit")
    print("="*60)
    
    choice = input("\nSelect option (1-5): ").strip()
    return choice

async def run_system():
    try:
        system = NexusPrimeSmart()
        logger.info("NEXUS-PRIME SMART initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize system: {e}")
        print(f"❌ Error: {e}")
        return
    
    while True:
        choice = main_menu()
        
        if choice == "1":
            print("\n🔄 Processing all active campaigns...")
            results = await system.process_all_active()
            
            total_sent = 0
            total_qualified = 0
            
            for result in results:
                print(f"\n📊 Campaign: {result.get('campaign_name')}")
                print(f"   Processed: {result.get('processed')}")
                print(f"   Qualified: {result.get('qualified')}")
                print(f"   Sent: {result.get('sent')}")
                print(f"   Failed: {result.get('failed')}")
                
                total_sent += result.get('sent', 0)
                total_qualified += result.get('qualified', 0)
            
            print(f"\n🎯 Total across all campaigns:")
            print(f"   Qualified: {total_qualified}")
            print(f"   Sent: {total_sent}")
        
        elif choice == "2":
            campaign_id = input("\nEnter campaign ID: ").strip()
            if campaign_id:
                print(f"\n🔄 Processing campaign {campaign_id}...")
                result = await system.process_campaign(campaign_id)
                
                if "error" in result:
                    print(f"❌ Error: {result['error']}")
                else:
                    print(f"\n✅ Campaign: {result.get('campaign_name')}")
                    print(f"📈 Results:")
                    print(f"   Total found: {result.get('total_found')}")
                    print(f"   Processed: {result.get('processed')}")
                    print(f"   Qualified: {result.get('qualified')}")
                    print(f"   Sent: {result.get('sent')}")
                    print(f"   Failed: {result.get('failed')}")
                    
                    if result.get('final_stats'):
                        stats = result['final_stats']
                        print(f"\n📊 Campaign Statistics:")
                        print(f"   Total leads: {stats.get('total_leads', 0)}")
                        print(f"   Contacted: {stats.get('contacted_leads', 0)}")
                        print(f"   Responded: {stats.get('responded_leads', 0)}")
                        print(f"   Response rate: {stats.get('response_rate', 0):.1f}%")
                    
                    if result.get('messenger_stats'):
                        msg_stats = result['messenger_stats']
                        print(f"\n📨 Messenger Statistics:")
                        print(f"   Total sent: {msg_stats.get('total_sent', 0)}")
                        print(f"   Emails sent: {msg_stats.get('emails_sent', 0)}")
            else:
                print("❌ Campaign ID required")
        
        elif choice == "3":
            stats = system.get_stats()
            print("\n📈 System Statistics:")
            print(f"   Total processed: {stats['processed_total']}")
            print(f"   Messages sent: {stats['total_sent']}")
            print(f"   Messages failed: {stats['total_failed']}")
            print(f"   Emails sent: {stats['emails_sent']}")
            print(f"   Emails failed: {stats['emails_failed']}")
        
        elif choice == "4":
            test_email = input("\nEnter test email address: ").strip()
            if test_email:
                sender = EmailSender()
                success, response = sender.send(
                    to_email=test_email,
                    subject="Test from NEXUS-PRIME",
                    body="This is a test email from NEXUS-PRIME SMART system."
                )
                
                if success:
                    print("✅ Test email sent successfully!")
                else:
                    print(f"❌ Failed to send test email: {response}")
            else:
                print("❌ Email address required")
        
        elif choice == "5":
            print("\n👋 Exiting NEXUS-PRIME SMART...")
            break
        
        else:
            print("\n❌ Invalid option")

if __name__ == "__main__":
    print("🚀 NEXUS-PRIME SMART - Intelligent Outreach System")
    print("="*60)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERROR: SUPABASE_URL and SUPABASE_KEY environment variables are required")
        print("   Set them in your environment or create a .env file")
        sys.exit(1)
    
    print(f"✅ Supabase: Connected")
    print(f"🔑 Google API: {'Available' if GOOGLE_API_KEY else 'Not configured'}")
    print(f"📧 Email SMTP: {'Available' if SMTP_USERNAME and SMTP_PASSWORD else 'Not configured'}")
    print("="*60)
    
    asyncio.run(run_system())
