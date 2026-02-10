import logging
from typing import Dict, List, Tuple, Any
import openai
from transformers import pipeline
import torch
import re
from datetime import datetime

from config.settings import settings
from core.models import Lead

logger = logging.getLogger(__name__)

class IntentAnalyzer:
    """محلل ذكي للنوايا باستخدام الذكاء الاصطناعي"""
    
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # تحميل نماذج Transformers محلية للتحليل الأساسي
        try:
            self.sentiment_analyzer = pipeline("sentiment-analysis", 
                                             model="distilbert-base-uncased-finetuned-sst-2-english")
            self.zero_shot_classifier = pipeline("zero-shot-classification",
                                               model="facebook/bart-large-mnli")
        except Exception as e:
            logger.warning(f"Could not load local models: {e}")
            self.sentiment_analyzer = None
            self.zero_shot_classifier = None
    
    def analyze_content(self, content: str, source_url: str = "") -> Dict[str, Any]:
        """تحليل متقدم للمحتوى باستخدام GPT-4"""
        try:
            # تحليل النية الأساسي
            intent_analysis = self._analyze_intent_gpt(content)
            
            # تحليل المشاعر
            sentiment = self._analyze_sentiment(content)
            
            # استخراج الكلمات المفتاحية
            keywords = self._extract_keywords(content)
            
            # تحليل السياق
            context = self._analyze_context(content, source_url)
            
            # حساب النتيجة الإجمالية
            overall_score = self._calculate_overall_score(intent_analysis, sentiment, context)
            
            return {
                'intent_analysis': intent_analysis,
                'sentiment': sentiment,
                'keywords': keywords,
                'context': context,
                'overall_score': overall_score,
                'analysis_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing content: {e}")
            return self._get_fallback_analysis(content)
    
    def _analyze_intent_gpt(self, content: str) -> Dict[str, Any]:
        """تحليل النية باستخدام GPT-4"""
        try:
            prompt = f"""
            Analyze the following content for business/purchasing intent. Provide a detailed analysis including:
            
            1. Primary intent category (e.g., seeking solution, comparison, complaint, inquiry, recommendation)
            2. Urgency level (1-10)
            3. Budget indication if any
            4. Decision maker likelihood
            5. Specific needs mentioned
            
            Content: {content[:2000]}
            
            Respond in JSON format with these keys: category, score_0_to_100, urgency, has_budget, is_decision_maker, needs_list, confidence
            """
            
            response = self.openai_client.chat.completions.create(
                model=settings.ANALYSIS_MODEL,
                messages=[
                    {"role": "system", "content": "You are a business intent analysis expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            import json
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error(f"Error in GPT intent analysis: {e}")
            return self._analyze_intent_local(content)
    
    def _analyze_intent_local(self, content: str) -> Dict[str, Any]:
        """تحليل النية باستخدام النماذج المحلية"""
        if not self.zero_shot_classifier or len(content) < 10:
            return self._get_fallback_analysis(content)
        
        try:
            candidate_labels = [
                "actively seeking to purchase",
                "researching options",
                "has problem needing solution",
                "sharing experience",
                "casual browsing",
                "complaint or issue",
                "recommendation request"
            ]
            
            result = self.zero_shot_classifier(content, candidate_labels, multi_label=True)
            
            # حساب النتيجة
            top_label = result['labels'][0]
            top_score = result['scores'][0] * 100
            
            # تعيين فئات بناءً على التسمية
            if top_label in ["actively seeking to purchase", "has problem needing solution"]:
                category = "high_intent"
            elif top_label in ["researching options", "recommendation request"]:
                category = "medium_intent"
            else:
                category = "low_intent"
            
            return {
                'category': category,
                'score_0_to_100': round(top_score, 2),
                'urgency': 5,
                'has_budget': False,
                'is_decision_maker': True,
                'needs_list': [],
                'confidence': 0.7
            }
            
        except Exception as e:
            logger.error(f"Error in local intent analysis: {e}")
            return self._get_fallback_analysis(content)
    
    def _analyze_sentiment(self, content: str) -> Dict[str, Any]:
        """تحليل المشاعر"""
        if not self.sentiment_analyzer or len(content) < 10:
            return {'sentiment': 'neutral', 'score': 0.5}
        
        try:
            # استخدام أول 512 حرف للتحليل
            truncated = content[:512]
            result = self.sentiment_analyzer(truncated)[0]
            
            return {
                'sentiment': result['label'].lower(),
                'score': round(result['score'], 3)
            }
            
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}")
            return {'sentiment': 'neutral', 'score': 0.5}
    
    def _extract_keywords(self, content: str) -> List[str]:
        """استخراج الكلمات المفتاحية"""
        try:
            # إزالة علامات الترقيم وتحويل إلى حروف صغيرة
            words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
            
            # قائمة الكلمات الشائعة التي نريد تجاهلها
            stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 
                         'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
                         'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
                         'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'why', 'ask',
                         'big', 'can', 'come', 'dear', 'find', 'give', 'good', 'have', 'here',
                         'into', 'just', 'know', 'like', 'look', 'make', 'more', 'most', 'only',
                         'over', 'same', 'some', 'take', 'than', 'that', 'them', 'then', 'they',
                         'this', 'well', 'went', 'what', 'when', 'will', 'with', 'your', 'from',
                         'about', 'would', 'could', 'should', 'there', 'their', 'which'}
            
            # حساب تكرار الكلمات
            from collections import Counter
            word_counts = Counter(words)
            
            # ترشيح الكلمات الشائعة
            keywords = [word for word, count in word_counts.most_common(15) 
                      if word not in stop_words and count > 1]
            
            return keywords[:10]  # إرجاع أفضل 10 كلمات
            
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            return []
    
    def _analyze_context(self, content: str, source_url: str) -> Dict[str, Any]:
        """تحليل السياق"""
        context = {
            'source_type': self._detect_source_type(source_url),
            'content_length': len(content),
            'has_questions': '?' in content,
            'has_contact_info': self._has_contact_info(content),
            'likely_industry': self._detect_industry(content),
            'professional_level': self._detect_professional_level(content)
        }
        return context
    
    def _detect_source_type(self, url: str) -> str:
        """اكتشاف نوع المصدر من الرابط"""
        url_lower = url.lower()
        
        if 'twitter.com' in url_lower or 'x.com' in url_lower:
            return 'twitter'
        elif 'linkedin.com' in url_lower:
            return 'linkedin'
        elif 'github.com' in url_lower:
            return 'github'
        elif 'producthunt.com' in url_lower:
            return 'product_hunt'
        elif 'medium.com' in url_lower:
            return 'medium'
        elif 'reddit.com' in url_lower:
            return 'reddit'
        else:
            return 'website'
    
    def _has_contact_info(self, content: str) -> bool:
        """التحقق من وجود معلومات اتصال"""
        patterns = [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # بريد إلكتروني
            r'\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',  # هاتف
            r'@[A-Za-z0-9_]+',  # حساب تويتر
            r'linkedin\.com/in/[A-Za-z0-9-]+'  # رابط لينكد إن
        ]
        
        for pattern in patterns:
            if re.search(pattern, content):
                return True
        
        return False
    
    def _detect_industry(self, content: str) -> str:
        """اكتشاف الصناعة من المحتوى"""
        industries = {
            'tech': ['software', 'code', 'programming', 'developer', 'startup', 'tech', 'app', 'api'],
            'finance': ['finance', 'banking', 'investment', 'stock', 'crypto', 'blockchain'],
            'marketing': ['marketing', 'seo', 'social media', 'brand', 'advertising'],
            'health': ['health', 'medical', 'fitness', 'wellness', 'doctor'],
            'education': ['education', 'learning', 'course', 'university', 'student']
        }
        
        content_lower = content.lower()
        scores = {}
        
        for industry, keywords in industries.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            if score > 0:
                scores[industry] = score
        
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return 'general'
    
    def _detect_professional_level(self, content: str) -> str:
        """اكتشاف المستوى المهني"""
        content_lower = content.lower()
        
        executive_terms = ['ceo', 'cto', 'cfo', 'founder', 'director', 'vp', 'executive']
        manager_terms = ['manager', 'lead', 'head of', 'senior', 'principal']
        junior_terms = ['junior', 'entry', 'student', 'intern', 'associate']
        
        if any(term in content_lower for term in executive_terms):
            return 'executive'
        elif any(term in content_lower for term in manager_terms):
            return 'manager'
        elif any(term in content_lower for term in junior_terms):
            return 'junior'
        
        return 'unknown'
    
    def _calculate_overall_score(self, intent: Dict, sentiment: Dict, context: Dict) -> float:
        """حساب النتيجة الإجمالية"""
        score = 0.0
        
        # وزن النية
        if 'score_0_to_100' in intent:
            score += intent['score_0_to_100'] * 0.6
        
        # وزن المشاعر (الإيجابية تضيف نقاط)
        if sentiment.get('sentiment') == 'POSITIVE':
            score += 10
        elif sentiment.get('sentiment') == 'NEGATIVE':
            score -= 5
        
        # وزن السياق
        if context.get('has_questions', False):
            score += 5
        
        if context.get('has_contact_info', False):
            score += 10
        
        # وزن المستوى المهني
        professional_level = context.get('professional_level', 'unknown')
        if professional_level == 'executive':
            score += 15
        elif professional_level == 'manager':
            score += 10
        
        # التأكد من أن النتيجة بين 0 و 100
        return max(0, min(100, score))
    
    def _get_fallback_analysis(self, content: str) -> Dict[str, Any]:
        """تحليل بديل عند الفشل"""
        return {
            'intent_analysis': {
                'category': 'unknown',
                'score_0_to_100': 50.0,
                'urgency': 3,
                'has_budget': False,
                'is_decision_maker': False,
                'needs_list': [],
                'confidence': 0.3
            },
            'sentiment': {'sentiment': 'neutral', 'score': 0.5},
            'keywords': [],
            'context': {
                'source_type': 'unknown',
                'content_length': len(content),
                'has_questions': '?' in content,
                'has_contact_info': False,
                'likely_industry': 'general',
                'professional_level': 'unknown'
            },
            'overall_score': 50.0,
            'analysis_timestamp': datetime.now().isoformat()
        }
