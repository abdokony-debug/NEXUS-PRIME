import logging
import smtplib
import aiohttp
import asyncio
from typing import Dict, List, Optional, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import tweepy
import json

from config.settings import settings
from core.models import Lead, Platform
from utils.helpers import format_message

logger = logging.getLogger(__name__)

class MessageSender:
    """مرسل ذكي للرسائل عبر منصات متعددة"""
    
    def __init__(self):
        self.twitter_client = None
        self.linkedin_client = None
        self.email_session = None
        
        # تهيئة عملاء APIs
        self._initialize_clients()
    
    def _initialize_clients(self):
        """تهيئة عملاء APIs للمنصات المختلفة"""
        try:
            # Twitter Client
            if all([settings.TWITTER_API_KEY, settings.TWITTER_API_SECRET, 
                   settings.TWITTER_ACCESS_TOKEN, settings.TWITTER_ACCESS_SECRET]):
                auth = tweepy.OAuth1UserHandler(
                    settings.TWITTER_API_KEY,
                    settings.TWITTER_API_SECRET,
                    settings.TWITTER_ACCESS_TOKEN,
                    settings.TWITTER_ACCESS_SECRET
                )
                self.twitter_client = tweepy.API(auth)
                logger.info("Twitter client initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Twitter client: {e}")
        
        # Note: LinkedIn API requires more complex setup
        # For production, use linkedin-api library with proper authentication
    
    async def send_message(self, lead: Lead, campaign_data: Dict, platform: Platform) -> Tuple[bool, str]:
        """إرسال رسالة مخصصة عبر المنصة المحددة"""
        try:
            logger.info(f"Attempting to send message via {platform.value} to {lead.url}")
            
            # توليد رسالة مخصصة
            message = self._generate_personalized_message(lead, campaign_data, platform)
            
            if platform == Platform.EMAIL:
                success, response = await self._send_email(lead, message, campaign_data)
            elif platform == Platform.TWITTER:
                success, response = self._send_twitter_dm(lead, message)
            elif platform == Platform.LINKEDIN:
                success, response = await self._send_linkedin_message(lead, message)
            else:
                success, response = False, f"Platform {platform.value} not supported"
            
            if success:
                logger.info(f"Successfully sent message via {platform.value}")
                lead.message_sent = True
                lead.last_contacted = datetime.now()
            else:
                logger.error(f"Failed to send message via {platform.value}: {response}")
            
            return success, response
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return False, str(e)
    
    def _generate_personalized_message(self, lead: Lead, campaign_data: Dict, platform: Platform) -> str:
        """توليد رسالة مخصصة بناءً على بيانات العميل والحملة"""
        
        # القوالب حسب المنصة
        templates = {
            Platform.EMAIL.value: """
Subject: {subject}

Hi {name},

{intro}

{specific_mention}

I noticed {observation} and thought you might be interested in {product_service}.

{usp}

You can learn more here: {product_link}

Looking forward to connecting!

Best regards,
{signature}
            """,
            
            Platform.TWITTER.value: """
Hi {name}!

{intro}

{specific_mention}

{usp}

Check it out: {product_link}

#relevant_hashtag
            """,
            
            Platform.LINKEDIN.value: """
Hi {name},

{intro}

{specific_mention}

I came across your profile and noticed {observation}. I believe {product_service} could be valuable for you.

{usp}

Learn more: {product_link}

Would love to connect and discuss further.

Best,
{signature}
            """
        }
        
        # جمع البيانات للمقابلات
        template_data = {
            'name': lead.name or "there",
            'subject': f"Regarding {campaign_data.get('product_name', 'our solution')}",
            'intro': self._get_intro_based_on_time(),
            'specific_mention': self._get_specific_mention(lead),
            'observation': self._get_observation(lead),
            'product_service': campaign_data.get('product_name', 'our solution'),
            'usp': campaign_data.get('usp', ''),
            'product_link': campaign_data.get('product_link', ''),
            'signature': campaign_data.get('signature', 'Best regards'),
            'relevant_hashtag': self._get_relevant_hashtag(lead)
        }
        
        # استخدام القالب المناسب
        template = templates.get(platform.value, templates[Platform.EMAIL.value])
        message = template.format(**template_data)
        
        # تقصير الرسالة إذا كانت طويلة (خاصة لتويتر)
        if platform == Platform.TWITTER and len(message) > 280:
            message = message[:275] + "..."
        
        return message.strip()
    
    def _get_intro_based_on_time(self) -> str:
        """الحصول على تحية مناسبة بناءً على الوقت"""
        hour = datetime.now().hour
        
        if 5 <= hour < 12:
            return "Hope you're having a great morning!"
        elif 12 <= hour < 17:
            return "Hope you're having a productive day!"
        elif 17 <= hour < 21:
            return "Hope you're having a great evening!"
        else:
            return "Hope you're doing well!"
    
    def _get_specific_mention(self, lead: Lead) -> str:
        """الحصول على ذكر محدد بناءً على بيانات العميل"""
        mentions = []
        
        if lead.company:
            mentions.append(f"at {lead.company}")
        
        if lead.job_title:
            mentions.append(f"as a {lead.job_title}")
        
        if lead.location:
            mentions.append(f"from {lead.location}")
        
        if mentions:
            return f"I see you're {' '.join(mentions)}. "
        
        return ""
    
    def _get_observation(self, lead: Lead) -> str:
        """الحصول على ملاحظة مخصصة بناءً على محتوى العميل"""
        if lead.content_summary:
            summary_lower = lead.content_summary.lower()
            
            if any(word in summary_lower for word in ['looking for', 'need', 'searching for']):
                return "you're looking for solutions in this area"
            elif any(word in summary_lower for word in ['problem', 'challenge', 'issue']):
                return "you mentioned some challenges that we might be able to help with"
            elif any(word in summary_lower for word in ['interest', 'interested in', 'passionate about']):
                return "your interest in this field"
        
        return "your work in this field"
    
    def _get_relevant_hashtag(self, lead: Lead) -> str:
        """الحصول على هاشتاق مناسب"""
        if lead.content_summary:
            summary_lower = lead.content_summary.lower()
            
            if any(word in summary_lower for word in ['tech', 'software', 'developer']):
                return "#tech #software"
            elif any(word in summary_lower for word in ['marketing', 'growth', 'seo']):
                return "#marketing #growth"
            elif any(word in summary_lower for word in ['startup', 'entrepreneur', 'founder']):
                return "#startup #entrepreneur"
        
        return "#business"
    
    async def _send_email(self, lead: Lead, message: str, campaign_data: Dict) -> Tuple[bool, str]:
        """إرسال بريد إلكتروني"""
        if not lead.email:
            return False, "No email address provided"
        
        try:
            # فصل الموضوع عن المحتوى
            lines = message.split('\n')
            subject = ""
            body_lines = []
            
            for line in lines:
                if line.lower().startswith('subject:'):
                    subject = line.replace('Subject:', '').replace('subject:', '').strip()
                else:
                    body_lines.append(line)
            
            body = '\n'.join(body_lines).strip()
            
            if not subject:
                subject = f"Regarding {campaign_data.get('product_name', 'our solution')}"
            
            # إنشاء رسالة البريد الإلكتروني
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USERNAME
            msg['To'] = lead.email
            msg['Subject'] = subject
            
            # إضافة نص الرسالة
            msg.attach(MIMEText(body, 'plain'))
            
            # إرسال البريد
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True, "Email sent successfully"
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False, str(e)
    
    def _send_twitter_dm(self, lead: Lead, message: str) -> Tuple[bool, str]:
        """إرسال رسالة مباشرة على تويتر"""
        if not self.twitter_client:
            return False, "Twitter client not initialized"
        
        try:
            # استخراج اسم المستخدم من الرابط
            import re
            username_match = re.search(r'twitter\.com/([^/]+)', lead.url) or re.search(r'x\.com/([^/]+)', lead.url)
            
            if not username_match:
                return False, "Could not extract username from URL"
            
            username = username_match.group(1).strip('@')
            
            # الحصول على معرف المستخدم
            user = self.twitter_client.get_user(screen_name=username)
            
            # إرسال الرسالة المباشرة
            self.twitter_client.send_direct_message(user.id, message)
            
            return True, f"Twitter DM sent to @{username}"
            
        except tweepy.TweepyException as e:
            logger.error(f"Twitter API error: {e}")
            return False, str(e)
        except Exception as e:
            logger.error(f"Error sending Twitter DM: {e}")
            return False, str(e)
    
    async def _send_linkedin_message(self, lead: Lead, message: str) -> Tuple[bool, str]:
        """إرسال رسالة على لينكد إن"""
        # Note: LinkedIn API requires OAuth 2.0 and specific permissions
        # This is a placeholder implementation
        
        logger.warning("LinkedIn messaging not fully implemented. Requires OAuth 2.0 setup.")
        return False, "LinkedIn messaging requires additional setup"
    
    async def check_response(self, lead: Lead, platform: Platform) -> Tuple[bool, Optional[str]]:
        """التحقق من وجود رد من العميل"""
        # هذه دالة متقدمة تتطلب مراقبة الردود
        # في الإصدار الحالي، نعيد قيمة افتراضية
        
        return False, None
    
    def validate_contact_info(self, lead: Lead, platform: Platform) -> bool:
        """التحقق من صحة معلومات الاتصال"""
        if platform == Platform.EMAIL:
            return self._validate_email(lead.email)
        elif platform == Platform.TWITTER:
            return bool(lead.url and ('twitter.com' in lead.url or 'x.com' in lead.url))
        elif platform == Platform.LINKEDIN:
            return bool(lead.url and 'linkedin.com' in lead.url)
        
        return False
    
    def _validate_email(self, email: str) -> bool:
        """التحقق من صحة البريد الإلكتروني"""
        if not email:
            return False
        
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
