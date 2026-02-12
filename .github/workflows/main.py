print("🟢 SYSTEM BOOT: INITIALIZING...")
import os
import sys
import json
import time
from datetime import datetime

# نحاول استيراد المكتبات ونطبع خطأ واضح إذا فشلت
try:
    from supabase import create_client
    from groq import Groq
    from duckduckgo_search import DDGS
    print("✅ Libraries Loaded Successfully.")
except ImportError as e:
    print(f"🔴 CRITICAL ERROR: Library missing - {e}")
    sys.exit(1)

# إعدادات الاتصال
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("🔴 Secrets are missing! Check GitHub Settings.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
brain = Groq(api_key=GROQ_API_KEY)
hunter = DDGS()

def run_nexus():
    print("🚀 NEXUS ENGINE STARTED.")
    
    # 1. جلب الحملات
    try:
        response = supabase.table('campaigns').select("*").eq('status', 'active').execute()
        campaigns = response.data
    except Exception as e:
        print(f"🔴 DB Error: {e}")
        return

    if not campaigns:
        print("⚠️ No active campaigns found in database.")
        print("   -> Go to Supabase > campaigns table > set status to 'active'")
        return

    print(f"📋 Found {len(campaigns)} active campaigns.")

    for camp in campaigns:
        print(f"⚔️ Executing: {camp['name']}")
        keywords = camp['keywords'].split(',')
        
        for kw in keywords:
            kw = kw.strip()
            # بحث دقيق جداً
            query = f'"{kw}" (site:reddit.com OR site:twitter.com OR site:quora.com)'
            if camp.get('target_region'):
                query += f' location:"{camp["target_region"]}"'
            
            print(f"🔎 Searching for: {query}")
            
            try:
                results = hunter.text(query, max_results=5)
                if not results:
                    print(f"   -> No results for '{kw}'")
                    continue
                
                print(f"   -> Found {len(results)} results. Analyzing...")

                for res in results:
                    # تحليل الذكاء الاصطناعي
                    prompt = f"""
                    Analyze buying intent for: {camp['product_link']}
                    USP: {camp['usp']}
                    Content: "{res['title']} {res['body']}"
                    
                    Return JSON: {{ "score": int, "reason": "str", "draft_msg": "str" }}
                    """
                    
                    completion = brain.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model="llama3-70b-8192",
                        response_format={"type": "json_object"}
                    )
                    analysis = json.loads(completion.choices[0].message.content)
                    
                    if analysis['score'] > 80:
                        print(f"   ✅ TARGET LOCKED! Score: {analysis['score']}")
                        # حفظ النتيجة
                        supabase.table('leads').upsert({
                            "campaign_id": camp['id'],
                            "url": res['href'],
                            "intent_score": analysis['score'],
                            "ai_analysis": analysis['reason'],
                            "message_draft": analysis['draft_msg'],
                            "status": "ready_to_send",
                            "created_at": datetime.utcnow().isoformat()
                        }, on_conflict='url').execute()
                    else:
                        print(f"   -> Low score ({analysis['score']}). Ignored.")

            except Exception as e:
                print(f"⚠️ Search Error: {e}")
                time.sleep(2)

    print("🏁 JOB COMPLETE.")

if __name__ == "__main__":
    run_nexus()
