import os
import sys
import json
from supabase import create_client, Client
from duckduckgo_search import DDGS
from loguru import logger

# إعداد السجلات (Logging)
logger.remove()
logger.add(sys.stderr, format="<green>{time:HH:mm:ss}</green> | <level>{message}</level>", level="INFO")

def run_nexus():
    logger.info("🚀 SYSTEM START: NEXUS-PRIME ENGINE")

    # 1. الاتصال بقاعدة البيانات
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.critical("❌ ERROR: Database credentials missing in Secrets!")
        return

    try:
        supabase: Client = create_client(url, key)
        logger.info("✅ Database Connected Successfully.")
    except Exception as e:
        logger.critical(f"❌ Database Connection Failed: {e}")
        return

    # 2. جلب الحملات النشطة
    try:
        response = supabase.table('campaigns').select("*").eq('status', 'active').execute()
        campaigns = response.data
    except Exception as e:
        logger.error(f"❌ Failed to fetch campaigns: {e}")
        return

    if not campaigns:
        logger.warning("⚠️ WARNING: No active campaigns found in database.")
        logger.warning("👉 Fix: Go to Supabase -> campaigns table -> set 'status' to 'active'.")
        return

    logger.info(f"📋 Found {len(campaigns)} active campaigns. Starting processing...")

    # 3. معالجة كل حملة
    hunter = DDGS()
    
    for camp in campaigns:
        logger.info(f"⚔️ Processing Campaign: {camp.get('name', 'Unnamed')}")
        keywords = camp.get('keywords', 'marketing')
        region = camp.get('target_region', 'wt-wt')
        
        # تحسين البحث
        query = f'"{keywords}" site:reddit.com OR site:twitter.com'
        if region and region != 'wt-wt':
            query += f' location:"{region}"'
            
        logger.info(f"🔎 Searching Query: {query}")

        try:
            results = hunter.text(query, max_results=5)
            if not results:
                logger.warning("⚠️ No results found for this query.")
                continue
                
            logger.info(f"✅ Found {len(results)} raw leads. Saving to DB...")
            
            for res in results:
                # حفظ النتائج في جدول leads
                lead_data = {
                    "campaign_id": camp['id'],
                    "url": res['href'],
                    "title": res['title'],
                    "snippet": res['body'],
                    "status": "raw_found",  # حالة أولية
                    "created_at": "now()"
                }
                
                # استخدام upsert لمنع التكرار
                supabase.table('leads').upsert(lead_data, on_conflict='url').execute()
                print(f"   💾 Saved: {res['title'][:30]}...")

        except Exception as e:
            logger.error(f"❌ Search/Save Error: {e}")

    logger.success("🏁 SYSTEM FINISHED ALL TASKS.")

if __name__ == "__main__":
    run_nexus()
