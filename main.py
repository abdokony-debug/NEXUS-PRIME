import os
import sys
import re
import json
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from supabase import create_client
from groq import Groq
from duckduckgo_search import DDGS

# إعداد السجلات (Logging System)
def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    # طباعة ملونة لتسهيل القراءة في GitHub Actions
    colors = {"INFO": "\033[94m", "SUCCESS": "\033[92m", "WARNING": "\033[93m", "ERROR": "\033[91m", "END": "\033[0m"}
    color = colors.get(level, colors["INFO"])
    print(f"{color}[{timestamp}] {level}: {msg}{colors['END']}", flush=True)

log("🚀 SYSTEM BOOT: NEXUS-PRIME INTELLIGENT ENGINE LOADING...")

# 1. فحص المكتبات
try:
    from supabase import create_client
    from groq import Groq
    from duckduckgo_search import DDGS
    log("✅ Core Libraries Loaded.")
except ImportError as e:
    log(f"CRITICAL ERROR: Library missing - {e}", "ERROR")
    sys.exit(1)

# 2. إعداد الاتصال
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

if not SUPABASE_URL or not SUPABASE_KEY:
    log("Secrets Missing! Check GitHub Settings.", "FATAL")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
brain = Groq(api_key=GROQ_API_KEY)
hunter = DDGS()

# --- أدوات المساعدة ---

def clean_keyword(kw):
    """تنظيف الكلمة المفتاحية من الرموز التي يكتبها المستخدم بالخطأ"""
    # حذف علامات التنصيص والشرطات السفلية والمسافات الزائدة
    return kw.replace('"', '').replace("'", "").replace("_", " ").strip()

def send_email(to_email, subject, body):
    if not EMAIL_USER or not EMAIL_PASS:
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        log(f"Email Error: {e}", "ERROR")
        return False

def extract_email(text):
    match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
    return match.group(0) if match else None

# --- المحرك الرئيسي ---

def run_nexus():
    log("⚡ CONNECTING TO DATABASE...")
    
    try:
        response = supabase.table('campaigns').select("*").eq('status', 'active').execute()
        campaigns = response.data
    except Exception as e:
        log(f"DB Fetch Error: {e}", "ERROR")
        return

    if not campaigns:
        log("⚠️ No active campaigns found. Please set status='active' in Supabase.", "WARNING")
        return

    log(f"📋 Found {len(campaigns)} active campaigns.")

    for camp in campaigns:
        # إعدادات الحملة
        quota = camp.get('max_leads') or 5
        leads_acquired = 0
        
        # تنظيف وفصل الكلمات المفتاحية بذكاء
        raw_keywords = camp.get('keywords', '')
        # نفصل بالفواصل، وإذا لم توجد فواصل نعتبرها جملة واحدة
        keywords = [clean_keyword(k) for k in raw_keywords.split(',') if k.strip()]
        
        log(f"⚔️ Campaign: {camp['name']} | Quota: {quota} Leads | Keywords: {keywords}")

        # حلقة البحث (لن تتوقف حتى تجد العدد المطلوب أو تنتهي الكلمات)
        for keyword in keywords:
            if leads_acquired >= quota: break
            
            # --- استراتيجية البحث المتدرج ---
            search_strategies = [
                # 1. بحث دقيق في منصات النقاش (High Intent)
                f'{keyword} (site:reddit.com OR site:quora.com) "recommend"',
                # 2. بحث في تويتر (Realtime)
                f'{keyword} site:twitter.com',
                # 3. بحث عام واسع (Broad)
                f'{keyword} review or best',
                # 4. الملاذ الأخير
                f'{keyword}'
            ]

            for query in search_strategies:
                if leads_acquired >= quota: break
                
                log(f"🔎 Scanning Strategy: {query}")
                
                try:
                    # البحث
                    results = hunter.text(query, max_results=8)
                    
                    if not results:
                        log(f"   -> No results for strategy. Switching...", "WARNING")
                        continue # جرب الاستراتيجية التالية

                    log(f"   -> Found {len(results)} signals. Neural Analysis Running...")

                    for res in results:
                        if leads_acquired >= quota: break
                        
                        content = f"{res['title']} \n {res['body']}"
                        
                        # الذكاء الاصطناعي (Llama 3 70B)
                        prompt = f"""
                        Act as a Lead Generation Agent.
                        Product: {camp['product_link']}
                        USP: {camp['usp']}
                        Content: "{content}"
                        
                        Task:
                        1. Does this user have a problem my product can solve?
                        2. Rate Intent (0-100).
                        3. Draft a short, direct message.
                        
                        Return JSON: {{ "score": int, "reason": "str", "subject": "str", "body": "str" }}
                        """
                        
                        try:
                            completion = brain.chat.completions.create(
                                messages=[{"role": "user", "content": prompt}],
                                model="llama3-70b-8192",
                                response_format={"type": "json_object"}
                            )
                            analysis = json.loads(completion.choices[0].message.content)
                        except:
                            continue # Skip failed AI calls

                        # الفلترة (فوق 75)
                        if analysis.get('score', 0) > 75:
                            target_email = extract_email(content)
                            status = "ready"
                            
                            # محاولة الإرسال
                            if target_email:
                                sent = send_email(target_email, analysis['subject'], analysis['body'])
                                if sent:
                                    status = "sent"
                                    log(f"📧 EMAIL SENT to {target_email}", "SUCCESS")
                                else:
                                    log(f"❌ Email found but failed to send.", "WARNING")
                            else:
                                log(f"💾 Captured High-Intent Lead (Score: {analysis['score']})", "SUCCESS")

                            # الحفظ في قاعدة البيانات
                            lead_data = {
                                "campaign_id": camp['id'],
                                "url": res['href'],
                                "intent_score": analysis['score'],
                                "ai_analysis": analysis['reason'],
                                "message_draft": analysis['body'],
                                "status": status,
                                "created_at": datetime.utcnow().isoformat()
                            }
                            supabase.table('leads').upsert(lead_data, on_conflict='url').execute()
                            leads_acquired += 1
                        
                    time.sleep(1) # راحة قصيرة

                except Exception as e:
                    log(f"Search Error: {e}", "ERROR")
                    continue
        
        if leads_acquired >= quota:
            log(f"✅ Mission Accomplished: Secured {leads_acquired} Leads.", "SUCCESS")
        else:
            log(f"⚠️ Mission Finished. Secured {leads_acquired}/{quota} Leads. (Add more keywords)", "WARNING")

    log("🏁 SYSTEM SHUTDOWN.", "INFO")

if __name__ == "__main__":
    run_nexus()
