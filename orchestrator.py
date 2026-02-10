import asyncio
from core.cyber_hunter import CyberHunter
from services.finder import LeadFinder
from services.messenger import MessageSender

async def main():
    hunter = CyberHunter()
    targets = hunter.scan("AI automation")
    
    async with LeadFinder() as finder:
        leads = await finder.search_leads(["AI automation"], [])
    
    sender = MessageSender()
    for lead in leads:
        await sender.send_message(lead, {}, lead.platform)

if __name__ == "__main__":
    asyncio.run(main())
