from duckduckgo_search import DDGS
from loguru import logger
import time
import random
from tenacity import retry, stop_after_attempt, wait_exponential

class CyberHunter:
    def __init__(self):
        self.ddgs = DDGS()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def scan(self, keywords: str, region: str):
        query = f'"{keywords}" site:reddit.com OR site:twitter.com OR site:linkedin.com'
        if region:
            query += f' location:"{region}"'
        
        logger.info(f"Scanning: {query}")
        results = self.ddgs.text(query, max_results=10)
        return results or []
