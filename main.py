import os
import sys
import re
import json
import time
import random
import requests
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Libraries
from supabase import create_client
from groq import Groq
from duckduckgo_search import DDGS
from fake_useragent import UserAgent
from loguru import logger

# --- SETUP LOGGING ---
logger.remove()
logger.add(sys.stderr, format="<green>{time:HH:mm:ss}</green> | <level>{message}</level>", level="INFO")

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.critical("❌ FATAL: Database credentials missing.")
    sys.exit(1)

# --- CORE CLASSES ---

class StealthNetwork:
    """مسؤول عن التخفي وتغيير الهوية الرقمية"""
    def __init__(self):
        self.ua = UserAgent()
        self.proxies = [] # يمكن تفعيل جلب البروكسيات هنا
        
    def get_headers(self):
        """توليد هوية متصفح جديدة في كل طلب"""
        return {
            "User-Agent": self.ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            "Referer": "https://www.google.com/"
        }

class MultiEngineSearch:
    """محرك بحث متعدد الرؤوس (هيدرا)"""
    def __init__(self):
        self.ddgs = DDGS()
        self.network = StealthNetwork()
    
    def search_duckduckgo(self, query):
        """المحاولة الأولى: DuckDuckGo"""
        try:
            # backend='lite' هو الأسرع والأقل حظراً
            results = self.ddgs.text(query, max_results=8, backend='lite')
            if results: return results
        except Exception as e:
            logger.warning(f"⚠️ DDG Failed: {e}")
        return []

    def search_google_fallback(self, query):
        """المحاولة الثانية: محاكاة بحث جوجل"""
        # ملاحظة: هذا السكريبت يحاول قراءة جوجل كمتصفح
        # في بيئة GitHub قد يكون صعباً، لكننا نضعه كاحتياطي
        try:
            logger.info("🔄 Switching to Google Scraping Mode...")
            headers = self.network.get_headers()
            params = {'q': query, 'num': 10}
            response = requests.get('https://www.google.com/search', headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                # استخراج بسيط جداً (Regex) لتفادي تعقيد HTML
                # هذه طريقة 'قذرة' لكنها فعالة للطوارئ
                links = re.findall(r'href="/url\?q=(https://[^&]+)', response.text)
                clean_results = []
                for link in links[:5]:
                    if "google" not in link:
                        clean_results.append({'title': 'Google Result', 'body': 'Found via Google Fallback', 'href': link})
                return clean_results
        except Exception as e:
            logger.error(f"❌ Google Fallback Failed: {e}")
        return []

    def execute_search(self, query):
        """المدير الذي يقرر أي محرك يستخدم"""
        # 1. جرب DuckDuckGo
        results = self.search_duckduckgo(query)
        if results: return results
        
        # 2. انتظر قليلاً وجرب جوجل
        time.sleep(random.uniform(2, 5))
        return self.search_google_fallback(query)

class NeuralBrain:
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)

    def analyze(self, content, campaign):
        prompt = f"""
        Role: Marketing Sniper.
        Product: {campaign['product_link']}
        USP: {campaign['usp']}
        Content: "{content[:1000]}"
        
        Task:
        1. Is this relevant? (True/False)
        2. Score Intent (0-100).
        3. Draft Email.
        
        Return JSON: {{ "score": int, "is_relevant": bool, "subject": "str", "body": "str" }}
        """
        try:
            completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama3-70b-8192",
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except:
            return {"score": 0, "is_relevant": False}

class NexusHydra:
    def __init__(self):
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.search_engine = MultiEngineSearch()
        self.brain = NeuralBrain()

    def run(self):
        logger.info("🐉 NEXUS-HYDRA: ACTIVATED. ADAPTIVE MODE ON.")
        
        try:
            campaigns = self.supabase.table('campaigns').select("*").eq('status', 'active').execute().data
        except Exception as e:
            logger.error(f"DB Connection Failed: {e}")
            return

        if not campaigns:
            logger.warning("No active missions.")
            return

        for camp in campaigns:
            quota = camp.get('max_leads') or 5
            acquired = 0
            
            # تنظيف الكلمات
            keywords = [k.strip() for k in camp['keywords'].replace('"', '').split(',')]
            
            logger.info(f"⚔️ Mission: {camp['name']} | Targets: {keywords}")

            for kw in keywords:
                if acquired >= quota: break

                # استراتيجيات ذكية متغيرة
                queries = [
                    f'{kw} site:reddit.com',         # استراتيجية 1: المنتديات
                    f'{kw} "looking for"',           # استراتيجية 2: النية المباشرة
                    f'best {kw} 2025',               # استراتيجية 3: البحث العام
                ]

                for q in queries:
                    if acquired >= quota: break
                    
                    logger.info(f"🔎 Hunting: {q}")
                    results = self.search_engine.execute_search(q)
                    
                    if not results:
                        logger.warning("   -> No signals. Adapting...")
                        continue
                    
                    logger.info(f"   -> Found {len(results)} signals. Analyzing...")
                    
                    for res in results:
                        if acquired >= quota: break
                        
                        # دمج العنوان مع الوصف للتحليل
                        content = f"{res.get('title', '')} {res.get('body', '')}"
                        analysis = self.brain.analyze(content, camp)
                        
                        if analysis.get('score', 0) > 75:
                            logger.success(f"   🎯 TARGET LOCKED (Score: {analysis['score']})")
                            
                            # الحفظ
                            self.supabase.table('leads').upsert({
                                "campaign_id": camp['id'],
                                "url": res['href'],
                                "intent_score": analysis['score'],
                                "ai_analysis": str(analysis),
                                "message_draft": analysis.get('body'),
                                "status": "ready",
                                "created_at": datetime.utcnow().isoformat()
                            }, on_conflict='url').execute()
                            
                            acquired += 1
                        
                    time.sleep(random.uniform(1, 3)) # استراحة بشرية

            if acquired > 0:
                logger.success(f"✅ Campaign {camp['name']} finished with {acquired} leads.")
            else:
                logger.error(f"❌ Campaign {camp['name']} failed to find targets. Try broader keywords.")

if __name__ == "__main__":
    NexusHydra().run()
