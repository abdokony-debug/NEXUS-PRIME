from duckduckgo_search import DDGS
from loguru import logger
import time
import random

class CyberHunter:
    def __init__(self):
        self.ddgs = DDGS()

    def construct_kill_chain_query(self, keywords: str, platform: str):
        """Constructs advanced surgical search queries."""
        if platform == "reddit":
            return f'site:reddit.com "{keywords}" ("looking for" OR "recommend" OR "help needed") -promoted'
        elif platform == "twitter":
            return f'site:twitter.com "{keywords}" "anyone know" -filter:replies'
        return f'"{keywords}" "pricing" "review" -site:*.com'

    def scan(self, keywords: str):
        raw_targets = []
        platforms = ["reddit", "twitter"]
        
        for p in platforms:
            query = self.construct_kill_chain_query(keywords, p)
            logger.info(f"📡 Scanning Sector: {p} -> {query}")
            try:
                results = self.ddgs.text(query, max_results=10)
                for r in results:
                    raw_targets.append({
                        "url": r['href'],
                        "title": r['title'],
                        "snippet": r['body'],
                        "platform": p
                    })
                time.sleep(random.uniform(1, 2)) # Avoid detection
            except Exception as e:
                logger.warning(f"Scan interrupted: {e}")
        
        return raw_targets
