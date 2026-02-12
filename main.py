import os
import sys
import time

# طباعة رسالة فورية للتأكد أن بايثون يعمل
print("🟢 [SYSTEM BOOT] NEXUS-PRIME KERNEL LOADING...", flush=True)

try:
    from supabase import create_client
    from groq import Groq
    from duckduckgo_search import DDGS
    print("✅ Libraries Loaded Successfully.", flush=True)
except ImportError as e:
    print(f"🔴 CRITICAL: Library Missing -> {e}", flush=True)
    sys.exit(1)

# الاتصال بقاعدة البيانات
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("🔴 FATAL: Supabase Credentials Missing in Secrets!", flush=True)
    sys.exit(1)

supabase = create_client(url, key)
print("✅ Connected to Supabase.", flush=True)

# جلب الحملات
try:
    response = supabase.table('campaigns').select("*").eq('status', 'active').execute()
    campaigns = response.data
    print(f"📋 Found {len(campaigns)} active campaigns.", flush=True)
except Exception as e:
    print(f"🔴 DB Error: {e}", flush=True)
    sys.exit(1)

# إذا لم يجد حملات، يخبرك ويغلق
if not campaigns:
    print("⚠️ WARNING: No active campaigns. Please add a row in 'campaigns' table with status='active'.", flush=True)
    sys.exit(0)

# بدء المعالجة (Loop)
hunter = DDGS()
brain = Groq(api_key=os.getenv("GROQ_API_KEY"))

for camp in campaigns:
    print(f"⚔️ Processing: {camp.get('name', 'Unnamed')}", flush=True)
    keywords = camp.get('keywords', '').split(',')
    
    for kw in keywords:
        query = f'"{kw.strip()}" site:reddit.com'
        print(f"🔎 Searching: {query}", flush=True)
        
        try:
            results = hunter.text(query, max_results=3)
            if results:
                print(f"   -> Found {len(results)} results.", flush=True)
                for res in results:
                    # حفظ مبدئي للتأكد من الكتابة
                    print(f"   -> Saving: {res['title'][:30]}...", flush=True)
                    supabase.table('leads').upsert({
                        "campaign_id": camp['id'],
                        "url": res['href'],
                        "status": "raw_found"
                    }, on_conflict='url').execute()
            else:
                print("   -> No results found.", flush=True)
                
            time.sleep(1) # منع الحظر
            
        except Exception as e:
            print(f"⚠️ Search/Save Error: {e}", flush=True)

print("🏁 SYSTEM SHUTDOWN: ALL TASKS COMPLETED.", flush=True)
