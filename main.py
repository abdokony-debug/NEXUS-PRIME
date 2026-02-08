import asyncio
from core.neural_engine import NeuralEngine
from core.vector_memory import VectorMemory
from core.cyber_hunter import CyberHunter
from loguru import logger
import sys

# Configure logging
logger.remove()
logger.add(sys.stderr, format="<green>{time}</green> <level>{message}</level>", level="INFO")

async def nexus_protocol():
    logger.info("⚡ NEXUS-PRIME SYSTEM ONLINE ⚡")
    
    # Initialize Core Systems
    brain = NeuralEngine()
    memory = VectorMemory()
    hunter = CyberHunter()
    
    # 1. Load Strategic Missions
    missions = memory.fetch_missions()
    if not missions:
        logger.info("💤 No active missions. Entering sleep mode.")
        return

    for mission in missions:
        logger.info(f"⚔️ Executing Mission: {mission['name']}")
        
        # 2. Hunt for Targets
        raw_leads = hunter.scan(mission['keywords'])
        
        # 3. Neural Analysis (The AI Filter)
        for lead in raw_leads:
            context = {
                "lead_text": f"{lead['title']} \n {lead['snippet']}",
                "product_usp": mission['usp']
            }
            
            analysis = brain.cognitive_process(context, "intent_analysis")
            
            # 4. Decision Gate (Threshold > 85)
            if analysis and analysis['score'] >= 85:
                logger.success(f"🎯 High Value Target Locked! Score: {analysis['score']}")
                
                # 5. Store in Vector Memory
                lead_payload = {
                    "campaign_id": mission['id'],
                    "url": lead['url'],
                    "score": analysis['score'],
                    "reason": analysis['reason'],
                    "hook": analysis['suggested_hook']
                }
                memory.store_lead(lead_payload)
            else:
                logger.debug(f"Target discarded (Score: {analysis.get('score', 0)})")

if __name__ == "__main__":
    asyncio.run(nexus_protocol())
