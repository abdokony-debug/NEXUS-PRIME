import logging
import aiohttp
import asyncio
from typing import Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse, urljoin
import json
from datetime import datetime

from config.settings import settings
from core.models import Lead, Platform

logger = logging.getLogger(__name__)

class ContentScraper:
    """مستخرج محتوى ذكي من الويب"""
    
    def __init__(self):
        self.session = None
        self.timeout = aiohttp.ClientTimeout(total=settings.REQUEST_TIMEOUT)
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(timeout=self.timeout, headers=self.headers)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def scrape_url(self, url: str, platform: Platform = Platform.GENERIC) -> Dict:
        """استخراج المحتوى والمعلومات من الرابط"""
        try:
            logger.info(f"Scraping URL: {url}")
            
            if not self.session:
                self.session = aiohttp.ClientSession(timeout=self.timeout, headers=self.headers)
            
            async with self.session.get(url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch {url}: Status {response.status}")
                    return self._get_empty_scrape_data(url, platform)
                
                html = await response.text()
                
                # تحليل بناءً على المنصة
                if platform == Platform.TWITTER:
                    return await self._scrape_twitter(html, url)
                elif platform == Platform.LINKEDIN:
                    return await self._scrape_linkedin(html, url)
                elif platform == Platform.GITHUB:
                    return await self._scrape_github(html, url)
                else:
                    return await self._scrape_generic(html, url)
                
        except asyncio.TimeoutError:
            logger.warning(f"Timeout scraping {url}")
            return self._get_empty_scrape_data(url, platform)
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return self._get_empty_scrape_data(url, platform)
    
    async def _scrape_twitter(self, html: str, url: str) -> Dict:
        """استخراج بيانات تويتر"""
        soup = BeautifulSoup(html, 'lxml')
        
        data = {
            'url': url,
            'platform': Platform.TWITTER.value,
            'content': '',
            'author': '',
            'followers_count': 0,
            'engagement_metrics': {},
            'contact_info': {}
        }
        
        try:
            # محاولة استخراج البيانات من JSON-LD
            script_tags = soup.find_all('script', type='application/ld+json')
            for script in script_tags:
                try:
                    json_data = json.loads(script.string)
                    if isinstance(json_data, dict) and 'author' in json_data:
                        data['author'] = json_data['author'].get('name', '')
                        data['content'] = json_data.get('articleBody', '') or json_data.get('description', '')
                except:
                    continue
            
            # استخراج النص الرئيسي
            if not data['content']:
                main_content = soup.find('main') or soup.find('article') or soup.body
                if main_content:
                    # إزالة النصوص غير المرغوبة
                    for element in main_content.find_all(['script', 'style', 'nav', 'footer', 'aside']):
                        element.decompose()
                    data['content'] = main_content.get_text(separator=' ', strip=True)[:5000]
            
            # استخراج اسم المستخدم من الرابط
            parsed_url = urlparse(url)
            if parsed_url.path:
                parts = parsed_url.path.strip('/').split('/')
                if parts and parts[0] and not parts[0].startswith('?'):
                    data['author'] = data['author'] or f"@{parts[0]}"
            
            # البحث عن معلومات الاتصال
            contact_patterns = [
                r'contact@\S+\.\S+',
                r'hello@\S+\.\S+',
                r'info@\S+\.\S+',
                r'business@\S+\.\S+',
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            ]
            
            all_text = soup.get_text()
            for pattern in contact_patterns:
                emails = re.findall(pattern, all_text, re.IGNORECASE)
                if emails:
                    data['contact_info']['emails'] = list(set(emails))
                    break
            
            # البحث عن روابط الموقع
            website_links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text(strip=True)
                
                if any(site in href.lower() for site in ['linkedin.com', 'github.com', 'website', 'portfolio']):
                    website_links.append({'url': href, 'text': text})
                
                if 'http' in href and not any(site in href for site in ['twitter.com', 'x.com', 't.co']):
                    if any(keyword in text.lower() for keyword in ['website', 'site', 'portfolio', 'blog']):
                        website_links.append({'url': href, 'text': text})
            
            if website_links:
                data['contact_info']['websites'] = website_links
            
        except Exception as e:
            logger.error(f"Error parsing Twitter HTML: {e}")
        
        return data
    
    async def _scrape_linkedin(self, html: str, url: str) -> Dict:
        """استخراج بيانات لينكد إن"""
        soup = BeautifulSoup(html, 'lxml')
        
        data = {
            'url': url,
            'platform': Platform.LINKEDIN.value,
            'content': '',
            'author': '',
            'job_title': '',
            'company': '',
            'location': '',
            'contact_info': {}
        }
        
        try:
            # البحث في meta tags
            meta_tags = {
                'author': ['og:title', 'twitter:title', 'author'],
                'description': ['og:description', 'twitter:description', 'description'],
                'job_title': ['jobTitle', 'title'],
                'company': ['company', 'organization'],
                'location': ['location', 'locality']
            }
            
            for field, tag_names in meta_tags.items():
                for tag_name in tag_names:
                    tag = soup.find('meta', attrs={'property': tag_name}) or soup.find('meta', attrs={'name': tag_name})
                    if tag and tag.get('content'):
                        data[field] = tag['content']
                        break
            
            # استخراج النص الرئيسي
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'(content|main|body)'))
            if main_content:
                # تنظيف النص
                for element in main_content.find_all(['script', 'style', 'nav', 'footer', 'button', 'form']):
                    element.decompose()
                data['content'] = main_content.get_text(separator=' ', strip=True)[:10000]
            
            # البحث عن معلومات الاتصال
            contact_section = soup.find(text=re.compile(r'contact|connect|reach out|get in touch', re.IGNORECASE))
            if contact_section:
                parent = contact_section.parent
                if parent:
                    links = parent.find_all('a', href=True)
                    for link in links:
                        href = link['href']
                        if href.startswith('mailto:'):
                            email = href.replace('mailto:', '').split('?')[0]
                            if '@' in email:
                                data['contact_info']['email'] = email
                        elif 'linkedin.com/in' in href:
                            data['contact_info']['linkedin'] = href
            
            # استخراج المهارات
            skills = []
            skills_section = soup.find(text=re.compile(r'skills|expertise|technologies', re.IGNORECASE))
            if skills_section:
                skills_container = skills_section.find_parent(['div', 'section', 'ul', 'ol'])
                if skills_container:
                    skill_items = skills_container.find_all(['li', 'span', 'div'])
                    for item in skill_items[:20]:
                        skill_text = item.get_text(strip=True)
                        if skill_text and len(skill_text) < 50:
                            skills.append(skill_text)
            
            if skills:
                data['skills'] = skills
            
        except Exception as e:
            logger.error(f"Error parsing LinkedIn HTML: {e}")
        
        return data
    
    async def _scrape_github(self, html: str, url: str) -> Dict:
        """استخراج بيانات جيت هاب"""
        soup = BeautifulSoup(html, 'lxml')
        
        data = {
            'url': url,
            'platform': Platform.GITHUB.value,
            'content': '',
            'author': '',
            'bio': '',
            'location': '',
            'company': '',
            'repositories': 0,
            'followers': 0,
            'contact_info': {}
        }
        
        try:
            # استخراج معلومات الملف الشخصي
            profile_name = soup.find('span', class_=re.compile(r'p-name|vcard-fullname'))
            if profile_name:
                data['author'] = profile_name.get_text(strip=True)
            
            profile_bio = soup.find('div', class_=re.compile(r'p-note|user-profile-bio'))
            if profile_bio:
                data['bio'] = profile_bio.get_text(strip=True)
                data['content'] = data['bio']
            
            # استخراج المعلومات الإضافية
            details = soup.find('ul', class_=re.compile(r'vcard-details'))
            if details:
                for item in details.find_all('li', itemprop=True):
                    itemprop = item.get('itemprop', '')
                    text = item.get_text(strip=True)
                    
                    if 'worksFor' in itemprop or 'company' in itemprop:
                        data['company'] = text.replace('@', '').strip()
                    elif 'homeLocation' in itemprop or 'location' in itemprop:
                        data['location'] = text
                    elif 'url' in itemprop:
                        link = item.find('a', href=True)
                        if link and 'mailto:' in link['href']:
                            email = link['href'].replace('mailto:', '').split('?')[0]
                            if '@' in email:
                                data['contact_info']['email'] = email
                        elif link:
                            data['contact_info']['website'] = link['href']
            
            # إحصائيات
            repos_elem = soup.find('span', class_=re.compile(r'Counter'))
            if repos_elem:
                try:
                    data['repositories'] = int(repos_elem.get_text(strip=True).replace(',', ''))
                except:
                    pass
            
            followers_elem = soup.find('a', href=re.compile(r'followers'))
            if followers_elem:
                followers_text = followers_elem.find('span', class_=re.compile(r'Counter'))
                if followers_text:
                    try:
                        data['followers'] = int(followers_text.get_text(strip=True).replace(',', ''))
                    except:
                        pass
            
            # استخراج اللغات المستخدمة
            languages = []
            lang_section = soup.find('h2', string=re.compile(r'Languages', re.IGNORECASE))
            if lang_section:
                lang_container = lang_section.find_next_sibling()
                if lang_container:
                    lang_spans = lang_container.find_all('span', class_=re.compile(r'language-color'))
                    for span in lang_spans[:10]:
                        lang_name = span.find_next_sibling('span')
                        if lang_name:
                            languages.append(lang_name.get_text(strip=True))
            
            if languages:
                data['languages'] = languages
            
        except Exception as e:
            logger.error(f"Error parsing GitHub HTML: {e}")
        
        return data
    
    async def _scrape_generic(self, html: str, url: str) -> Dict:
        """استخراج بيانات عامة من أي موقع"""
        soup = BeautifulSoup(html, 'lxml')
        
        data = {
            'url': url,
            'platform': Platform.GENERIC.value,
            'content': '',
            'title': '',
            'author': '',
            'contact_info': {},
            'metadata': {}
        }
        
        try:
            # استخراج العنوان
            title = soup.find('title')
            if title:
                data['title'] = title.get_text(strip=True)
            
            # استخراج وصف meta
            description = soup.find('meta', attrs={'name': 'description'})
            if description and description.get('content'):
                data['content'] += description['content'] + ' '
            
            # استخراج محتوى المقالة
            article = soup.find('article') or soup.find('main') or soup.find('div', class_=re.compile(r'content|main|post|article'))
            if article:
                # تنظيف النص
                for element in article.find_all(['script', 'style', 'nav', 'footer', 'aside', 'form', 'button']):
                    element.decompose()
                article_text = article.get_text(separator=' ', strip=True)
                data['content'] += article_text[:15000]
            
            # استخراج اسم المؤلف
            author_selectors = [
                {'name': 'author'},
                {'property': 'article:author'},
                {'property': 'og:author'},
                {'class': re.compile(r'author|byline|writer')}
            ]
            
            for selector in author_selectors:
                if 'name' in selector:
                    meta = soup.find('meta', attrs={'name': selector['name']})
                    if meta and meta.get('content'):
                        data['author'] = meta['content']
                        break
                elif 'property' in selector:
                    meta = soup.find('meta', attrs={'property': selector['property']})
                    if meta and meta.get('content'):
                        data['author'] = meta['content']
                        break
                elif 'class' in selector:
                    elem = soup.find(attrs={'class': selector['class']})
                    if elem:
                        data['author'] = elem.get_text(strip=True)[:100]
                        break
            
            # استخراج معلومات الاتصال
            self._extract_contact_info(soup, data)
            
            # استخراج الكلمات المفتاحية
            keywords = soup.find('meta', attrs={'name': 'keywords'})
            if keywords and keywords.get('content'):
                data['metadata']['keywords'] = [k.strip() for k in keywords['content'].split(',')[:10]]
            
            # نوع المحتوى
            content_type = 'unknown'
            if soup.find('article'):
                content_type = 'article'
            elif soup.find('form'):
                content_type = 'form_page'
            elif 'blog' in url.lower():
                content_type = 'blog'
            elif 'product' in url.lower():
                content_type = 'product_page'
            
            data['metadata']['content_type'] = content_type
            
        except Exception as e:
            logger.error(f"Error parsing generic HTML: {e}")
        
        return data
    
    def _extract_contact_info(self, soup: BeautifulSoup, data: Dict):
        """استخراج معلومات الاتصال من الصفحة"""
        try:
            contact_info = {}
            all_text = soup.get_text()
            
            # البحث عن البريد الإلكتروني
            email_patterns = [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                r'mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})'
            ]
            
            emails = set()
            for pattern in email_patterns:
                found = re.findall(pattern, all_text, re.IGNORECASE)
                for email in found:
                    if isinstance(email, tuple):
                        email = email[0]
                    emails.add(email.lower())
            
            if emails:
                contact_info['emails'] = list(emails)
            
            # البحث عن الهواتف
            phone_patterns = [
                r'\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
                r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}',
                r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'
            ]
            
            phones = set()
            for pattern in phone_patterns:
                found = re.findall(pattern, all_text)
                for phone in found:
                    phones.add(phone)
            
            if phones:
                contact_info['phones'] = list(phones)
            
            # البحث عن روابط وسائل التواصل الاجتماعي
            social_patterns = {
                'linkedin': r'linkedin\.com/in/[A-Za-z0-9-]+',
                'twitter': r'(?:twitter\.com|x\.com)/[A-Za-z0-9_]+',
                'github': r'github\.com/[A-Za-z0-9-]+',
                'facebook': r'facebook\.com/[A-Za-z0-9.]+',
                'instagram': r'instagram\.com/[A-Za-z0-9._]+'
            }
            
            social_links = {}
            for platform, pattern in social_patterns.items():
                found = re.findall(pattern, all_text, re.IGNORECASE)
                if found:
                    social_links[platform] = list(set(['https://' + f if not f.startswith('http') else f for f in found]))
            
            if social_links:
                contact_info['social_media'] = social_links
            
            # البحث عن رابط الموقع
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text(strip=True).lower()
                
                if any(word in text for word in ['website', 'site', 'homepage', 'official site', 'portfolio']):
                    if href.startswith('http'):
                        contact_info['website'] = href
                        break
                elif 'contact' in text and href.startswith('http'):
                    contact_info['contact_page'] = href
            
            if contact_info:
                data['contact_info'] = contact_info
                
        except Exception as e:
            logger.error(f"Error extracting contact info: {e}")
    
    def _get_empty_scrape_data(self, url: str, platform: Platform) -> Dict:
        """إرجاع بيانات فارغة عند الفشل"""
        return {
            'url': url,
            'platform': platform.value,
            'content': '',
            'author': '',
            'contact_info': {},
            'metadata': {'error': 'scraping_failed'}
        }
