from core.database import DatabaseService
from core.cyber_hunter import CyberHunter
from core.neural_engine import NeuralEngine
from loguru import logger

class NexusOrchestrator:
    def __init__(self):
        self.db = DatabaseService()
        self.hunter = CyberHunter()
        self.engine = NeuralEngine()

    def run(self):
        missions = self.db.fetch_active_campaigns()
        for mission in missions:
            leads_acquired = 0
            max_leads = mission.get('max_leads', 5)
            
            raw_leads = self.hunter.scan(mission['keywords'], mission['target_region'])
            
            for lead in raw_leads:
                if leads_acquired >= max_leads:
                    break
                
                content = f"{lead['title']} {lead['body']}"
                result = self.engine.analyze(content, mission['usp'], mission['product_link'])
                
                if result.get('is_confirmed'):
                    self.db.log_lead({
                        "campaign_id": mission['id'],
                        "url": lead['href'],
                        "intent_score": result['score'],
                        "ai_analysis": result['analysis'],
                        "message_draft": result['message'],
                        "status": "confirmed"
                    })
                    leads_acquired += 1
