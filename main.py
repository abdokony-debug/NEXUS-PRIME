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

# إعداد السجلات
def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {msg}", flush=True)

log("🚀 SYSTEM BOOT: NEXUS-PRIME ENGINE LOADING...")

# التحقق من المكتبات
try:
    from supabase import create_client
    from groq import Groq
    from duckduckgo_search import DDGS
    log("✅ Libraries verified.")
except ImportError as e:
    log(f"🔴 CRITICAL ERROR: Library missing - {e}", "FATAL")
    sys.exit(1)

# الاتصال بالخدمات
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

if not SUPABASE_URL or not SUPABASE_KEY:
    log("🔴 Secrets Missing! Check GitHub Settings.", "FATAL")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
brain = Groq(api_key=GROQ_API_KEY)
hunter = DDGS()

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

def run_nexus():
    log("⚡ ENGINE STARTED. Fetching missions...")
    
    # 1. جلب الحملات
    try:
        response = supabase.table('campaigns').select("*").eq('status', 'active').execute()
        campaigns = response.data
    except Exception as e:
        log(f"DB Error: {e}", "ERROR")
        return

    if not campaigns:
        log("⚠️ No active campaigns found.", "WARNING")
        return

    log(f"📋 Found {len(campaigns)} active campaigns.")

    for camp in campaigns:
        quota = camp.get('max_leads') or 5
        leads_acquired = 0
        keywords = [k.strip() for k in camp['keywords'].split(',')]
        
        log(f"⚔️ Campaign: {camp['name']} | Quota: {quota}")

        for keyword in keywords:
            if leads_acquired >= quota: break
            
            # بحث ذكي ومرن (بدون علامات تنصيص)
            query = f'{keyword} (site:reddit.com OR site:twitter.com OR site:quora.com OR "looking for")'
            if camp.get('target_region'):
                query += f' location:"{camp["target_region"]}"'
            
            log(f"🔎 Scanning: {query}")
            
            try:
                # محاولة البحث مع إعادة المحاولة
                results = hunter.text(query, max_results=10)
                if not results:
                    log(f"   -> No results for '{keyword}'", "WARNING")
                    continue
                
                log(f"   -> Found {len(results)} raw signals. Analyzing...")

                for res in results:
                    if leads_acquired >= quota: break
                    
                    content = f"{res['title']} {res['body']}"
                    
                    # تحليل الذكاء الاصطناعي
                    prompt = f"""
                    Role: Sales Expert.
                    Product: {camp['product_link']}
                    USP: {camp['usp']}
                    Input: "{content}"
                    
                    Task:
                    1. Score buying intent (0-100).
                    2. Draft a cold email offering the product as a solution.
                    
                    Return JSON: {{ "score": int, "reason": "str", "draft_subject": "str", "draft_body": "str" }}
                    """
                    
                    try:
                        completion = brain.chat.completions.create(
                            messages=[{"role": "user", "content": prompt}],
                            model="llama3-70b-8192",
                            response_format={"type": "json_object"}
                        )
                        analysis = json.loads(completion.choices[0].message.content)
                    except:
                        continue

                    # فلترة النتائج القوية (فوق 75%)
                    if analysis.get('score', 0) > 75:
                        target_email = extract_email(content)
                        status = "ready_to_send"
                        
                        if target_email:
                            sent = send_email(target_email, analysis['draft_subject'], analysis['draft_body'])
                            if sent:
                                status = "sent"
                                log(f"📧 EMAIL SENT to {target_email}", "SUCCESS")
                            else:
                                log(f"❌ Email Failed to {target_email}", "ERROR")
                        else:
                            log(f"💾 Lead Captured (No Email) - Score: {analysis['score']}", "INFO")

                        # حفظ في قاعدة البيانات
                        lead_data = {
                            "campaign_id": camp['id'],
                            "url": res['href'],
                            "intent_score": analysis['score'],
                            "ai_analysis": analysis['reason'],
                            "message_draft": analysis['draft_body'],
                            "status": status,
                            "created_at": datetime.utcnow().isoformat()
                        }
                        supabase.table('leads').upsert(lead_data, on_conflict='url').execute()
                        leads_acquired += 1
                    else:
                        # (اختياري) سجل النتائج الضعيفة للمراجعة
                        pass

                time.sleep(2) # تجنب الحظر

            except Exception as e:
                log(f"Search Loop Error: {e}", "ERROR")
                continue
        
        if leads_acquired < quota:
            log(f"⚠️ Campaign finished with only {leads_acquired}/{quota} leads.", "WARNING")
        else:
            log(f"✅ Campaign '{camp['name']}' Target Reached!", "SUCCESS")

    log("🏁 ALL SYSTEMS GO. SHUTTING DOWN.", "SUCCESS")

if __name__ == "__main__":
    run_nexus()
