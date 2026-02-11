import os
import sys
import re
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from supabase import create_client, Client
from groq import Groq
from duckduckgo_search import DDGS
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_fixed

# Setup Logging
logger.remove()
logger.add(sys.stderr, format="<green>{time:HH:mm:ss}</green> | <level>{message}</level>", level="INFO")

class NexusConfig:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    # SMTP Settings for Sending (Gmail Example)
    EMAIL_HOST = "smtp.gmail.com"
    EMAIL_PORT = 587
    EMAIL_USER = os.getenv("EMAIL_USER") # Your Email
    EMAIL_PASS = os.getenv("EMAIL_PASS") # Your App Password

class SmartSender:
    """Handles the actual delivery of messages to targets."""
    def __init__(self):
        self.server = None

    def extract_email(self, text):
        match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
        return match.group(0) if match else None

    def send_offer(self, to_email, subject, body):
        if not NexusConfig.EMAIL_USER or not NexusConfig.EMAIL_PASS:
            logger.warning("⚠️ SMTP Credentials missing. Skipping actual send.")
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = NexusConfig.EMAIL_USER
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(NexusConfig.EMAIL_HOST, NexusConfig.EMAIL_PORT)
            server.starttls()
            server.login(NexusConfig.EMAIL_USER, NexusConfig.EMAIL_PASS)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            logger.error(f"❌ Sending Failed: {e}")
            return False

class NeuralBrain:
    def __init__(self):
        self.client = Groq(api_key=NexusConfig.GROQ_API_KEY)

    def analyze_and_draft(self, lead_text, campaign):
        prompt = f"""
        Role: Elite Sales AI.
        Mission: Find buyers for '{campaign['product_link']}'.
        USP: {campaign['usp']}
        
        Input Text: "{lead_text}"
        
        Tasks:
        1. Score Intent (0-100). High score ONLY if they need a solution NOW.
        2. Draft a polite, short cold email offering the solution.
        3. Extract the prospect's email if present in text.

        Output JSON:
        {{
            "score": int,
            "is_buyer": bool,
            "email_found": "email_address_or_null",
            "subject": "email_subject",
            "body": "email_body_content"
        }}
        """
        try:
            resp = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama3-70b-8192",
                response_format={"type": "json_object"}
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            logger.error(f"Brain Error: {e}")
            return None

class NexusEngine:
    def __init__(self):
        self.supabase = create_client(NexusConfig.SUPABASE_URL, NexusConfig.SUPABASE_KEY)
        self.hunter = DDGS()
        self.brain = NeuralBrain()
        self.sender = SmartSender()

    def run(self):
        logger.info("🚀 NEXUS-PRIME: INTELLIGENT SENDING MODE ACTIVATED")
        
        # 1. Fetch Campaigns
        campaigns = self.supabase.table('campaigns').select("*").eq('status', 'active').execute().data
        
        for camp in campaigns:
            quota = camp.get('max_leads', 5)
            sent_count = 0
            logger.info(f"⚔️ Campaign: {camp['name']} | Quota: {quota}")

            # 2. Hunt
            query = f'"{camp["keywords"]}" "@gmail.com" OR "contact me" OR "hiring"' 
            if camp.get('target_region'):
                query += f' location:"{camp["target_region"]}"'

            results = self.hunter.text(query, max_results=15)
            
            # 3. Process & Send
            for res in results:
                if sent_count >= quota: break
                
                content = f"{res['title']} {res['body']}"
                analysis = self.brain.analyze_and_draft(content, camp)

                if analysis and analysis['score'] > 85:
                    # Try to extract email from AI analysis or Regex
                    target_email = analysis.get('email_found') or self.sender.extract_email(content)
                    
                    status = "ready"
                    if target_email:
                        logger.info(f"📧 Sending to: {target_email}")
                        sent = self.sender.send_offer(target_email, analysis['subject'], analysis['body'])
                        status = "sent" if sent else "failed"
                    else:
                        logger.info(f"💾 High Intent found (No Email) - Storing for manual review.")

                    # Log to DB
                    self.supabase.table('leads').upsert({
                        "campaign_id": camp['id'],
                        "url": res['href'],
                        "intent_score": analysis['score'],
                        "ai_analysis": str(analysis),
                        "message_draft": analysis['body'],
                        "status": status,
                        "created_at": datetime.utcnow().isoformat()
                    }, on_conflict='url').execute()
                    
                    sent_count += 1
            
            logger.success(f"✅ Campaign Finished. Actions Taken: {sent_count}")

if __name__ == "__main__":
    NexusEngine().run()
