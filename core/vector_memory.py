import os
from supabase import create_client, Client
from loguru import logger
from datetime import datetime

class VectorMemory:
    def __init__(self):
        url: str = os.getenv("SUPABASE_URL")
        key: str = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Database Credentials Missing")
        self.supabase: Client = create_client(url, key)

    def fetch_missions(self):
        """Fetch active campaigns from DB."""
        try:
            response = self.supabase.table('campaigns').select("*").eq('status', 'active').execute()
            return response.data
        except Exception as e:
            logger.error(f"Memory Read Error: {e}")
            return []

    def store_lead(self, lead_data: dict):
        """Store verified target with high intent."""
        try:
            data = {
                "campaign_id": lead_data['campaign_id'],
                "url": lead_data['url'],
                "intent_score": lead_data['score'],
                "ai_analysis": lead_data['reason'],
                "message_draft": lead_data['hook'],
                "created_at": datetime.utcnow().isoformat(),
                "status": "ready_to_send"
            }
            # Insert logic here (upsert to avoid duplicates)
            self.supabase.table('leads').upsert(data, on_conflict='url').execute()
            logger.success(f"💾 Lead Stored: {lead_data['url']}")
        except Exception as e:
            logger.error(f"Memory Write Error: {e}")
