import os
import sys
import re
import json
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from supabase import create_client
from groq import Groq
from duckduckgo_search import DDGS
from loguru import logger

logger.remove()
logger.add(sys.stderr, format="<green>{time:HH:mm:ss}</green> | <level>{message}</level>", level="INFO")

class NexusConfig:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    EMAIL_HOST = "smtp.gmail.com"
    EMAIL_PORT = 587
    EMAIL_USER = os.getenv("EMAIL_USER")
    EMAIL_PASS = os.getenv("EMAIL_PASS")

class SmartSender:
    def extract_email(self, text):
        match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
        return match.group(0) if match else None

    def send_offer(self, to_email, subject, body):
        if not NexusConfig.EMAIL_USER or not NexusConfig.EMAIL_PASS:
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
        except:
            return False

class NeuralBrain:
    def __init__(self):
        self.client = Groq(api_key=NexusConfig.GROQ_API_KEY)

    def analyze_and_draft(self, lead_text, campaign):
        prompt = f"""
        Role: Elite Sales AI.
        Mission: Identify if user wants to buy: '{campaign['keywords']}'.
        Product Link: {campaign['product_link']}
        USP: {campaign['usp']}
        Input: "{lead_text}"
        Output JSON:
        {{
            "score": int,
            "is_buyer": bool,
            "email_found": "email_or_null",
            "subject": "short_subject",
            "body": "persuasive_message_body"
        }}
        """
        try:
            resp = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama3-70b-8192",
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            return json.loads(resp.choices[0].message.content)
        except:
            return None

class NexusEngine:
    def __init__(self):
        self.supabase = create_client(NexusConfig.SUPABASE_URL, NexusConfig.SUPABASE_KEY)
        self.hunter = DDGS()
        self.brain = NeuralBrain()
        self.sender = SmartSender()

    def run(self):
        logger.info("🚀 NEXUS-PRIME ENGINE STARTED")
        try:
            campaigns = self.supabase.table('campaigns').select("*").eq('status', 'active').execute().data
        except Exception as e:
            logger.error(f"DB Error: {e}")
            return

        if not campaigns:
            logger.warning("No active campaigns found.")
            return

        for camp in campaigns:
            quota = camp.get('max_leads') or 5
            sent_count = 0
            keywords_list = [k.strip() for k in camp['keywords'].split(',')]

            logger.info(f"⚔️ Campaign: {camp['name']} | Targets: {keywords_list}")

            for keyword in keywords_list:
                if sent_count >= quota: break

                query = f'"{keyword}" (site:reddit.com OR site:twitter.com OR site:quora.com)'
                if camp.get('target_region'):
                    query += f' location:"{camp["target_region"]}"'

                logger.info(f"🔎 Scanning: {query}")

                try:
                    results = self.hunter.text(query, max_results=10)
                    if not results: continue

                    for res in results:
                        if sent_count >= quota: break
                        
                        content = f"{res['title']} {res['body']}"
                        analysis = self.brain.analyze_and_draft(content, camp)

                        if analysis and analysis.get('score', 0) > 80:
                            target_email = analysis.get('email_found') or self.sender.extract_email(content)
                            status = "ready"
                            
                            if target_email:
                                sent = self.sender.send_offer(target_email, analysis.get('subject', 'Offer'), analysis.get('body', 'Hi'))
                                status = "sent" if sent else "failed"
                                logger.success(f"📧 EMAIL SENT to {target_email}")
                            else:
                                logger.info(f"💾 Lead Captured (No Email) - Score: {analysis['score']}")

                            lead_data = {
                                "campaign_id": camp['id'],
                                "url": res['href'],
                                "intent_score": analysis['score'],
                                "ai_analysis": str(analysis),
                                "message_draft": analysis.get('body'),
                                "status": status,
                                "created_at": datetime.utcnow().isoformat()
                            }
                            
                            self.supabase.table('leads').upsert(lead_data, on_conflict='url').execute()
                            sent_count += 1
                    
                    time.sleep(1)

                except Exception as e:
                    logger.error(f"Search Loop Error: {e}")
                    continue
            
            logger.success(f"✅ Campaign '{camp['name']}' Completed. Leads Processed: {sent_count}")

if __name__ == "__main__":
    NexusEngine().run()
