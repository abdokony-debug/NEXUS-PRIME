import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from supabase import create_client, Client
import pandas as pd

from config.settings import settings
from core.models import Campaign, Lead, CampaignStatus, LeadStatus

logger = logging.getLogger(__name__)

class DatabaseService:
    """خدمة قاعدة البيانات المتكاملة مع Supabase"""
    
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self._create_tables_if_not_exist()
    
    def _create_tables_if_not_exist(self):
        """إنشاء الجداول الأساسية إذا لم تكن موجودة"""
        # الجداول ستكون موجودة بالفعل في Supabase، هذه للتحقق فقط
        pass
    
    # === Campaign Operations ===
    
    def get_active_campaigns(self) -> List[Campaign]:
        """جلب الحملات النشطة"""
        try:
            response = self.client.table('campaigns') \
                .select('*') \
                .eq('status', CampaignStatus.ACTIVE.value) \
                .execute()
            
            campaigns = []
            for row in response.data:
                campaign = Campaign.from_db_row(row)
                campaigns.append(campaign)
            
            logger.info(f"Retrieved {len(campaigns)} active campaigns")
            return campaigns
            
        except Exception as e:
            logger.error(f"Error fetching campaigns: {e}")
            return []
    
    def update_campaign_status(self, campaign_id: str, status: CampaignStatus):
        """تحديث حالة الحملة"""
        try:
            update_data = {
                'status': status.value,
                'updated_at': datetime.now().isoformat()
            }
            
            if status == CampaignStatus.ACTIVE:
                update_data['started_at'] = datetime.now().isoformat()
            elif status == CampaignStatus.COMPLETED:
                update_data['completed_at'] = datetime.now().isoformat()
            
            self.client.table('campaigns') \
                .update(update_data) \
                .eq('id', campaign_id) \
                .execute()
            
            logger.info(f"Updated campaign {campaign_id} status to {status.value}")
            
        except Exception as e:
            logger.error(f"Error updating campaign status: {e}")
    
    # === Lead Operations ===
    
    def insert_lead(self, lead: Lead) -> bool:
        """إدخال عميل محتمل جديد"""
        try:
            lead_dict = lead.to_dict()
            
            # تنظيف البيانات
            lead_dict = {k: v for k, v in lead_dict.items() if v is not None}
            
            response = self.client.table('leads').insert(lead_dict).execute()
            
            if response.data:
                lead.id = response.data[0]['id']
                logger.info(f"Inserted lead: {lead.url}")
                return True
            
        except Exception as e:
            logger.error(f"Error inserting lead: {e}")
        
        return False
    
    def update_lead(self, lead: Lead) -> bool:
        """تحديث بيانات العميل المحتمل"""
        try:
            lead_dict = lead.to_dict()
            lead_id = lead_dict.pop('id', None)
            
            if not lead_id:
                return False
            
            lead_dict['updated_at'] = datetime.now().isoformat()
            
            self.client.table('leads') \
                .update(lead_dict) \
                .eq('id', lead_id) \
                .execute()
            
            logger.info(f"Updated lead: {lead_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating lead: {e}")
            return False
    
    def get_campaign_leads(self, campaign_id: str, status: Optional[LeadStatus] = None) -> List[Lead]:
        """جلب عملاء حملة معينة"""
        try:
            query = self.client.table('leads').select('*').eq('campaign_id', campaign_id)
            
            if status:
                query = query.eq('status', status.value)
            
            response = query.execute()
            
            leads = []
            for row in response.data:
                lead = Lead()
                for key, value in row.items():
                    if hasattr(lead, key):
                        if key in ['platform', 'status']:
                            value = Platform(value) if key == 'platform' else LeadStatus(value)
                        setattr(lead, key, value)
                leads.append(lead)
            
            return leads
            
        except Exception as e:
            logger.error(f"Error fetching campaign leads: {e}")
            return []
    
    # === Analytics & Reporting ===
    
    def get_campaign_stats(self, campaign_id: str) -> Dict[str, Any]:
        """إحصائيات تفصيلية للحملة"""
        try:
            # جلب جميع عملاء الحملة
            response = self.client.table('leads') \
                .select('*') \
                .eq('campaign_id', campaign_id) \
                .execute()
            
            if not response.data:
                return {
                    'total_leads': 0,
                    'contacted_leads': 0,
                    'converted_leads': 0,
                    'avg_intent_score': 0,
                    'response_rate': 0,
                    'conversion_rate': 0
                }
            
            df = pd.DataFrame(response.data)
            
            # حساب الإحصائيات
            total_leads = len(df)
            contacted_leads = df['message_sent'].sum() if 'message_sent' in df.columns else 0
            converted_leads = df[df['status'] == LeadStatus.CONVERTED.value].shape[0]
            responded_leads = df[df['status'] == LeadStatus.RESPONDED.value].shape[0]
            
            avg_intent = df['intent_score'].mean() if 'intent_score' in df.columns else 0
            response_rate = (responded_leads / contacted_leads * 100) if contacted_leads > 0 else 0
            conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
            
            # تحليل حسب المنصة
            platform_stats = {}
            if 'platform' in df.columns:
                platform_stats = df['platform'].value_counts().to_dict()
            
            # تحليل حسب النتيجة
            score_distribution = {}
            if 'intent_score' in df.columns:
                bins = [0, 25, 50, 75, 100]
                labels = ['Very Low', 'Low', 'Medium', 'High']
                df['score_category'] = pd.cut(df['intent_score'], bins=bins, labels=labels)
                score_distribution = df['score_category'].value_counts().to_dict()
            
            return {
                'total_leads': int(total_leads),
                'contacted_leads': int(contacted_leads),
                'converted_leads': int(converted_leads),
                'responded_leads': int(responded_leads),
                'avg_intent_score': float(avg_intent),
                'response_rate': float(response_rate),
                'conversion_rate': float(conversion_rate),
                'platform_distribution': platform_stats,
                'score_distribution': score_distribution,
                'top_performing_platform': max(platform_stats.items(), key=lambda x: x[1])[0] if platform_stats else None
            }
            
        except Exception as e:
            logger.error(f"Error calculating campaign stats: {e}")
            return {}
    
    def get_daily_report(self, date: datetime = None) -> Dict[str, Any]:
        """تقرير يومي عن الأداء"""
        if date is None:
            date = datetime.now()
        
        start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        try:
            # جلب الحملات النشطة
            campaigns = self.get_active_campaigns()
            
            report = {
                'date': date.date().isoformat(),
                'total_campaigns': len(campaigns),
                'campaigns': []
            }
            
            for campaign in campaigns:
                stats = self.get_campaign_stats(campaign.id)
                campaign_report = {
                    'campaign_id': campaign.id,
                    'campaign_name': campaign.name,
                    'stats': stats
                }
                report['campaigns'].append(campaign_report)
            
            # حساب الإجماليات
            total_leads = sum(c['stats']['total_leads'] for c in report['campaigns'])
            total_contacted = sum(c['stats']['contacted_leads'] for c in report['campaigns'])
            total_converted = sum(c['stats']['converted_leads'] for c in report['campaigns'])
            
            report['total_leads'] = total_leads
            report['total_contacted'] = total_contacted
            report['total_converted'] = total_converted
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating daily report: {e}")
            return {}
    
    def export_leads_to_csv(self, campaign_id: str, filepath: str) -> bool:
        """تصدير عملاء الحملة إلى ملف CSV"""
        try:
            leads = self.get_campaign_leads(campaign_id)
            
            if not leads:
                return False
            
            df = pd.DataFrame([lead.to_dict() for lead in leads])
            df.to_csv(filepath, index=False, encoding='utf-8')
            
            logger.info(f"Exported {len(leads)} leads to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting leads: {e}")
            return False
