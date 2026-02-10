import logging
import aiohttp
import asyncio
from typing import List, Dict, Optional
import json
from urllib.parse import quote_plus
from datetime import datetime

from config.settings import settings
from core.models import Platform

logger = logging.getLogger(__name__)

class LeadFinder:
    """باحث ذكي عن العملاء المحتملين باستخدام محركات بحث متعددة"""
    
    def __init__(self):
        self.session = None
        self.timeout = aiohttp.ClientTimeout(total=settings.REQUEST_TIMEOUT)
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(timeout=self.timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def search_leads(self, 
                          keywords: List[str], 
                          platforms: List[Platform],
                          max_results: int = 50,
                          region: str = "") -> List[Dict]:
        """بحث عن عملاء محتملين بناءً على الكلمات المفتاحية والمنصات"""
        try:
            logger.info(f"Searching for leads with keywords: {keywords}, platforms: {platforms}")
            
            if not self.session:
                self.session = aiohttp.ClientSession(timeout=self.timeout)
            
            # إنشاء استعلامات بحث لكل منصة
            search_tasks = []
            
            for platform in platforms:
                platform_query = self._build_platform_query(keywords, platform, region)
                
                if platform == Platform.TWITTER:
                    task = self._search_twitter(platform_query, max_results // len(platforms))
                elif platform == Platform.LINKEDIN:
                    task = self._search_linkedin(platform_query, max_results // len(platforms))
                elif platform == Platform.GITHUB:
                    task = self._search_github(platform_query, max_results // len(platforms))
                elif platform == Platform.PRODUCT_HUNT:
                    task = self._search_product_hunt(platform_query, max_results // len(platforms))
                else:
                    task = self._search_google(platform_query, max_results // len(platforms))
                
                search_tasks.append(task)
            
            # تشغيل جميع عمليات البحث بشكل متزامن
            results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # دمج وتصفية النتائج
            all_leads = []
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Search error: {result}")
                    continue
                all_leads.extend(result)
            
            # إزالة التكرارات
            unique_leads = self._deduplicate_leads(all_leads)
            
            logger.info(f"Found {len(unique_leads)} unique leads")
            return unique_leads[:max_results]
            
        except Exception as e:
            logger.error(f"Error in lead search: {e}")
            return []
    
    def _build_platform_query(self, keywords: List[str], platform: Platform, region: str) -> str:
        """بناء استعلام بحث مخصص للمنصة"""
        base_query = " ".join(keywords)
        
        if platform == Platform.TWITTER:
            site_filter = "site:twitter.com OR site:x.com"
            return f"{base_query} {site_filter}"
        
        elif platform == Platform.LINKEDIN:
            site_filter = "site:linkedin.com/in/"
            return f"{base_query} {site_filter}"
        
        elif platform == Platform.GITHUB:
            site_filter = "site:github.com"
            return f"{base_query} {site_filter}"
        
        elif platform == Platform.PRODUCT_HUNT:
            site_filter = "site:producthunt.com"
            return f"{base_query} {site_filter}"
        
        elif platform == Platform.MEDIUM:
            site_filter = "site:medium.com"
            return f"{baseQuery} {site_filter}"
        
        else:
            # إضافة مصطلحات بحث محسنة للنتائج العامة
            enhanced_terms = ["contact", "email", "hire", "consult", "services", "looking for"]
            return f"{base_query} {' '.join(enhanced_terms)}"
    
    async def _search_google(self, query: str, max_results: int) -> List[Dict]:
        """بحث باستخدام Google Custom Search API"""
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            
            params = {
                'key': settings.GOOGLE_API_KEY,
                'cx': settings.GOOGLE_CX,
                'q': query,
                'num': min(max_results, 10),
                'start': 1
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    logger.error(f"Google API error: {response.status}")
                    return []
                
                data = await response.json()
                items = data.get('items', [])
                
                leads = []
                for item in items:
                    lead = {
                        'url': item.get('link', ''),
                        'title': item.get('title', ''),
                        'snippet': item.get('snippet', ''),
                        'platform': self._detect_platform(item.get('link', '')),
                        'search_source': 'google',
                        'timestamp': datetime.now().isoformat()
                    }
                    leads.append(lead)
                
                return leads
                
        except Exception as e:
            logger.error(f"Google search error: {e}")
            return []
    
    async def _search_twitter(self, query: str, max_results: int) -> List[Dict]:
        """بحث في تويتر باستخدام Twitter API v2"""
        try:
            # Note: This requires Twitter API v2 access
            # For now, we'll use Google search with Twitter filter
            return await self._search_google(query, max_results)
            
        except Exception as e:
            logger.error(f"Twitter search error: {e}")
            return []
    
    async def _search_linkedin(self, query: str, max_results: int) -> List[Dict]:
        """بحث في لينكد إن"""
        try:
            # LinkedIn requires authentication
            # For now, use Google search with LinkedIn filter
            return await self._search_google(query, max_results)
            
        except Exception as e:
            logger.error(f"LinkedIn search error: {e}")
            return []
    
    async def _search_github(self, query: str, max_results: int) -> List[Dict]:
        """بحث في جيت هاب باستخدام GitHub API"""
        try:
            url = "https://api.github.com/search/users"
            
            # استخراج كلمة البحث الرئيسية
            search_term = query.replace("site:github.com", "").strip()
            
            params = {
                'q': f"{search_term} in:login,in:name",
                'per_page': min(max_results, 30)
            }
            
            headers = {
                'Accept': 'application/vnd.github.v3+json'
            }
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status != 200:
                    logger.error(f"GitHub API error: {response.status}")
                    return []
                
                data = await response.json()
                items = data.get('items', [])
                
                leads = []
                for item in items[:max_results]:
                    lead = {
                        'url': item.get('html_url', ''),
                        'title': item.get('login', ''),
                        'snippet': item.get('bio', ''),
                        'platform': Platform.GITHUB.value,
                        'search_source': 'github_api',
                        'timestamp': datetime.now().isoformat(),
                        'metadata': {
                            'type': item.get('type', ''),
                            'score': item.get('score', 0)
                        }
                    }
                    leads.append(lead)
                
                return leads
                
        except Exception as e:
            logger.error(f"GitHub search error: {e}")
            return await self._search_google(query, max_results)
    
    async def _search_product_hunt(self, query: str, max_results: int) -> List[Dict]:
        """بحث في Product Hunt"""
        try:
            # Product Hunt search via Google
            return await self._search_google(query, max_results)
            
        except Exception as e:
            logger.error(f"Product Hunt search error: {e}")
            return []
    
    def _detect_platform(self, url: str) -> str:
        """اكتشاف المنصة من الرابط"""
        url_lower = url.lower()
        
        platform_mapping = {
            'twitter.com': Platform.TWITTER.value,
            'x.com': Platform.TWITTER.value,
            'linkedin.com': Platform.LINKEDIN.value,
            'github.com': Platform.GITHUB.value,
            'producthunt.com': Platform.PRODUCT_HUNT.value,
            'medium.com': Platform.MEDIUM.value,
            'reddit.com': Platform.REDDIT.value
        }
        
        for domain, platform in platform_mapping.items():
            if domain in url_lower:
                return platform
        
        return Platform.GENERIC.value
    
    def _deduplicate_leads(self, leads: List[Dict]) -> List[Dict]:
        """إزالة العملاء المكررين"""
        seen_urls = set()
        unique_leads = []
        
        for lead in leads:
            url = lead.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_leads.append(lead)
        
        return unique_leads
