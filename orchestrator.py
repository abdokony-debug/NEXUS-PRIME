import asyncio
import logging
from core.cyber_hunter import CyberHunter
from services.finder import LeadFinder
from services.messenger import MessageSender
from core.neural_engine import NeuralEngine

logging.basicConfig(level=logging.INFO, filename="nexus.log")

class NexusPrime:
    def __init__(self):
        self.ai = NeuralEngine()
        self.hunter = CyberHunter()
        self.sender = MessageSender()

    async def intelligence_cycle(self):
        logging.info("🧠 Intelligence cycle started")

        targets = self.hunter.scan("AI SaaS automation business")
        logging.info(f"Targets found: {len(targets)}")

        async with LeadFinder() as finder:
            leads = await finder.search_leads(["AI automation", "marketing SaaS"], [])

        for lead in leads[:10]:
            decision = self.ai.decide_action(lead)
            if decision == "ENGAGE":
                await self.sender.send_message(lead, {}, lead.platform)

    async def run_forever(self):
        while True:
            try:
                await self.intelligence_cycle()
                await asyncio.sleep(3600)  # كل ساعة
            except Exception as e:
                logging.error(f"CRITICAL ERROR: {e}")
                await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(NexusPrime().run_forever())
