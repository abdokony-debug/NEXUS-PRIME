import os
import sys
import json
import time
from datetime import datetime
from supabase import create_client
from groq import Groq
from duckduckgo_search import DDGS

# إعدادات النظام
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# تهيئة قاعدة البيانات
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Critical Error: {e}")
    sys.exit(1)

def log_to_db(event_type, message, campaign_name="System"):
    """دالة لكتابة التقارير مباشرة في قاعدة البيانات"""
    try:
        print(f"[{event_type}] {message}")
        supabase.table('system_logs').insert({
            "event_type": event_type,
            "message": str(message),
            "campaign_name": campaign_name
        }).execute()
    except Exception as e:
        print(f"Logging Error: {e}")

class NeuralBrain:
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)

    def analyze(self, text, usp, link):
        prompt = f"""
        Analyze this text for buying intent.
        Product: {usp}
        Link: {link}
        Text: "{text}"
        
        Return JSON ONLY:
        {{
            "score": int (0-100),
            "reason": "short explanation"
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
            log_to_db("ERROR", f"Brain Malfunction: {e}")
            return {"score": 0, "reason": "Error"}

def run_nexus():
    log_to_db("INFO", "🚀 System Started. Fetching missions...")

    # 1. جلب الحملات
    try:
        response = supabase.table('campaigns').select("*").eq('status', 'active').execute()
        campaigns = response.data
    except Exception as e:
        log_to_db("ERROR", f"Database Fetch Error: {e}")
        return

    if not campaigns:
        log_to_db("WARNING", "No active campaigns found. Please check 'status' column.")
        return

    hunter = DDGS()
    brain = NeuralBrain()

    for camp in campaigns:
        camp_name = camp['name']
        log_to_db("INFO", f"Starting Campaign: {camp_name}", camp_name)
        
        keywords = [k.strip() for k in camp['keywords'].split(',')]
        leads_processed = 0
        
        for keyword in keywords:
            query = f'"{keyword}" (site:reddit.com OR site:twitter.com)'
            if camp.get('target_region'):
                query += f' location:"{camp["target_region"]}"'
            
            log_to_db("INFO", f"Searching for: {query}", camp_name)
            
            try:
                results = hunter.text(query, max_results=5)
                if not results:
                    log_to_db("WARNING", f"No results found for keyword: {keyword}", camp_name)
                    continue
                
                log_to_db("INFO", f"Found {len(results)} raw results. Analyzing...", camp_name)

                for res in results:
                    content = f"{res['title']} {res['body']}"
                    analysis = brain.analyze(content, camp['usp'], camp['product_link'])
                    
                    if analysis['score'] > 80:
                        # حفظ العميل المؤكد
                        lead_data = {
                            "campaign_id": camp['id'],
                            "url": res['href'],
                            "intent_score": analysis['score'],
                            "ai_analysis": analysis['reason'],
                            "status": "ready"
                        }
                        supabase.table('leads').upsert(lead_data, on_conflict='url').execute()
                        log_to_db("SUCCESS", f"Lead Secured! Score: {analysis['score']}", camp_name)
                        leads_processed += 1
                    else:
                        # (اختياري) يمكننا تسجيل الفشل لنعرف لماذا رفضه
                        # log_to_db("INFO", f"Low Score ({analysis['score']}): {analysis['reason']}", camp_name)
                        pass

            except Exception as e:
                log_to_db("ERROR", f"Search Error: {e}", camp_name)
                continue
            
            time.sleep(2) # راحة لتجنب الحظر

        log_to_db("INFO", f"Campaign Finished. Total Leads: {leads_processed}", camp_name)

if __name__ == "__main__":
    run_nexus()
