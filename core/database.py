import os
from supabase import create_client, Client
from loguru import logger
from datetime import datetime

class DatabaseService:
    def __init__(self):
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"), 
            os.getenv("SUPABASE_KEY")
        )

    def fetch_active_campaigns(self):
        try:
            return self.supabase.table('campaigns').select("*").eq('status', 'active').execute().data
        except Exception as e:
            logger.error(f"DB Fetch Error: {e}")
            return []

    def log_lead(self, payload: dict):
        try:
            self.supabase.table('leads').upsert(payload, on_conflict='url').execute()
        except Exception as e:
            logger.error(f"DB Insert Error: {e}")
            
    def update_campaign_status(self, campaign_id: int, status: str):
        self.supabase.table('campaigns').update({'status': status}).eq('id', campaign_id).execute()
