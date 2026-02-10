from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class Platform(Enum):
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    EMAIL = "email"
    REDDIT = "reddit"
    GITHUB = "github"
    PRODUCT_HUNT = "producthunt"
    MEDIUM = "medium"
    GENERIC = "generic"

class LeadStatus(Enum):
    NEW = "new"
    PROCESSING = "processing"
    CONTACTED = "contacted"
    RESPONDED = "responded"
    CONVERTED = "converted"
    FAILED = "failed"

class CampaignStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"

@dataclass
class Lead:
    """نموذج عميل محتمل"""
    id: Optional[str] = None
    campaign_id: str = ""
    url: str = ""
    platform: Platform = Platform.GENERIC
    name: str = ""
    email: str = ""
    phone: str = ""
    company: str = ""
    job_title: str = ""
    location: str = ""
    intent_score: float = 0.0
    sentiment_score: float = 0.0
    relevance_score: float = 0.0
    content_summary: str = ""
    engagement_metrics: Dict[str, Any] = field(default_factory=dict)
    contact_info: Dict[str, Any] = field(default_factory=dict)
    status: LeadStatus = LeadStatus.NEW
    message_sent: bool = False
    response_received: bool = False
    last_contacted: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'url': self.url,
            'platform': self.platform.value,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'company': self.company,
            'job_title': self.job_title,
            'location': self.location,
            'intent_score': self.intent_score,
            'sentiment_score': self.sentiment_score,
            'relevance_score': self.relevance_score,
            'content_summary': self.content_summary,
            'engagement_metrics': self.engagement_metrics,
            'contact_info': self.contact_info,
            'status': self.status.value,
            'message_sent': self.message_sent,
            'response_received': self.response_received,
            'last_contacted': self.last_contacted,
            'created_at': self.created_at.isoformat()
        }

@dataclass
class Campaign:
    """نموذج حملة تسويقية"""
    id: Optional[str] = None
    name: str = ""
    description: str = ""
    keywords: List[str] = field(default_factory=list)
    target_platforms: List[Platform] = field(default_factory=list)
    target_regions: List[str] = field(default_factory=list)
    target_industries: List[str] = field(default_factory=list)
    target_job_titles: List[str] = field(default_factory=list)
    usp: str = ""
    product_link: str = ""
    messaging_tone: str = "professional"  # professional, casual, friendly, persuasive
    max_leads: int = 100
    min_intent_score: float = 70.0
    min_relevance_score: float = 60.0
    status: CampaignStatus = CampaignStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    @classmethod
    def from_db_row(cls, row: Dict) -> 'Campaign':
        campaign = cls()
        campaign.id = row.get('id')
        campaign.name = row.get('name', '')
        campaign.description = row.get('description', '')
        campaign.keywords = row.get('keywords', '').split(',') if row.get('keywords') else []
        campaign.target_platforms = [Platform(p) for p in row.get('target_platforms', '').split(',') if p]
        campaign.target_regions = row.get('target_regions', '').split(',') if row.get('target_regions') else []
        campaign.target_industries = row.get('target_industries', '').split(',') if row.get('target_industries') else []
        campaign.target_job_titles = row.get('target_job_titles', '').split(',') if row.get('target_job_titles') else []
        campaign.usp = row.get('usp', '')
        campaign.product_link = row.get('product_link', '')
        campaign.messaging_tone = row.get('messaging_tone', 'professional')
        campaign.max_leads = row.get('max_leads', 100)
        campaign.min_intent_score = row.get('min_intent_score', 70.0)
        campaign.min_relevance_score = row.get('min_relevance_score', 60.0)
        campaign.status = CampaignStatus(row.get('status', 'draft'))
        campaign.created_at = datetime.fromisoformat(row['created_at']) if row.get('created_at') else datetime.now()
        
        if row.get('started_at'):
            campaign.started_at = datetime.fromisoformat(row['started_at'])
        if row.get('completed_at'):
            campaign.completed_at = datetime.fromisoformat(row['completed_at'])
        
        return campaign
