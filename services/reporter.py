import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
from io import BytesIO
import base64

from core.database import DatabaseService
from core.models import Campaign

logger = logging.getLogger(__name__)

class ReportGenerator:
    """مولد تقارير ذكي ومتقدم"""
    
    def __init__(self, db_service: DatabaseService):
        self.db = db_service
    
    def generate_campaign_report(self, campaign_id: str, export_format: str = 'html') -> Dict:
        """توليد تقرير تفصيلي للحملة"""
        try:
            # جلب إحصائيات الحملة
            stats = self.db.get_campaign_stats(campaign_id)
            
            # جلب بيانات الحملة
            campaign = self._get_campaign_by_id(campaign_id)
            
            # إنشاء التقرير
            report = {
                'campaign_id': campaign_id,
                'campaign_name': campaign.name if campaign else 'Unknown',
                'generated_at': datetime.now().isoformat(),
                'time_period': 'all_time',
                'summary': self._generate_summary(stats),
                'detailed_stats': stats,
                'charts': self._generate_charts(stats),
                'recommendations': self._generate_recommendations(stats),
                'top_leads': self._get_top_leads(campaign_id, 10)
            }
            
            # تصدير إذا طلب
            if export_format == 'html':
                report['export'] = self._export_to_html(report)
            elif export_format == 'pdf':
                report['export'] = self._export_to_pdf(report)
            elif export_format == 'csv':
                report['export'] = self._export_to_csv(campaign_id)
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating campaign report: {e}")
            return {}
    
    def generate_dashboard_report(self) -> Dict:
        """توليد تقرير لوحة التحكم"""
        try:
            campaigns = self.db.get_active_campaigns()
            
            dashboard_data = {
                'total_campaigns': len(campaigns),
                'active_campaigns': sum(1 for c in campaigns if c.status.value == 'active'),
                'total_leads_today': self._get_todays_leads_count(),
                'conversion_rate_today': self._get_todays_conversion_rate(),
                'campaign_performance': [],
                'platform_performance': {},
                'daily_trends': self._get_daily_trends(7),
                'alerts': self._generate_alerts()
            }
            
            # أداء الحملات
            for campaign in campaigns:
                stats = self.db.get_campaign_stats(campaign.id)
                campaign_perf = {
                    'id': campaign.id,
                    'name': campaign.name,
                    'leads_count': stats.get('total_leads', 0),
                    'contacted_count': stats.get('contacted_leads', 0),
                    'converted_count': stats.get('converted_leads', 0),
                    'response_rate': stats.get('response_rate', 0),
                    'conversion_rate': stats.get('conversion_rate', 0)
                }
                dashboard_data['campaign_performance'].append(campaign_perf)
            
            # أداء المنصات
            platform_stats = {}
            for campaign in campaigns:
                stats = self.db.get_campaign_stats(campaign.id)
                platform_dist = stats.get('platform_distribution', {})
                
                for platform, count in platform_dist.items():
                    if platform not in platform_stats:
                        platform_stats[platform] = {
                            'total_leads': 0,
                            'converted_leads': 0,
                            'campaigns': []
                        }
                    
                    platform_stats[platform]['total_leads'] += count
            
            dashboard_data['platform_performance'] = platform_stats
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error generating dashboard report: {e}")
            return {}
    
    def _generate_summary(self, stats: Dict) -> Dict:
        """توليد ملخص تنفيذي"""
        total_leads = stats.get('total_leads', 0)
        contacted = stats.get('contacted_leads', 0)
        converted = stats.get('converted_leads', 0)
        response_rate = stats.get('response_rate', 0)
        conversion_rate = stats.get('conversion_rate', 0)
        
        summary = {
            'total_leads': total_leads,
            'contacted': contacted,
            'converted': converted,
            'response_rate': f"{response_rate:.1f}%",
            'conversion_rate': f"{conversion_rate:.1f}%",
            'performance_grade': self._calculate_grade(conversion_rate),
            'key_insights': []
        }
        
        # إضافة رؤى رئيسية
        if response_rate > 20:
            summary['key_insights'].append("Excellent response rate! Keep up the messaging strategy.")
        elif response_rate < 5:
            summary['key_insights'].append("Low response rate. Consider revising your messaging approach.")
        
        if conversion_rate > 10:
            summary['key_insights'].append("High conversion rate indicates strong product-market fit.")
        
        top_platform = stats.get('top_performing_platform')
        if top_platform:
            summary['key_insights'].append(f"{top_platform.title()} is your best performing platform.")
        
        return summary
    
    def _generate_charts(self, stats: Dict) -> Dict:
        """توليد رسوم بيانية"""
        charts = {}
        
        try:
            # 1. مخطط توزيع المنصات
            if stats.get('platform_distribution'):
                fig1 = px.pie(
                    values=list(stats['platform_distribution'].values()),
                    names=list(stats['platform_distribution'].keys()),
                    title='Lead Distribution by Platform'
                )
                charts['platform_distribution'] = fig1.to_html(full_html=False)
            
            # 2. مخطط توزيع النقاط
            if stats.get('score_distribution'):
                fig2 = px.bar(
                    x=list(stats['score_distribution'].keys()),
                    y=list(stats['score_distribution'].values()),
                    title='Lead Quality Distribution',
                    labels={'x': 'Intent Score Range', 'y': 'Number of Leads'}
                )
                charts['score_distribution'] = fig2.to_html(full_html=False)
            
            # 3. مخطط أداء الحملة
            metrics = ['Total Leads', 'Contacted', 'Converted']
            values = [
                stats.get('total_leads', 0),
                stats.get('contacted_leads', 0),
                stats.get('converted_leads', 0)
            ]
            
            fig3 = go.Figure(data=[
                go.Bar(name='Count', x=metrics, y=values, marker_color=['blue', 'orange', 'green'])
            ])
            
            fig3.update_layout(
                title='Campaign Performance Metrics',
                yaxis_title='Number of Leads'
            )
            
            charts['performance_metrics'] = fig3.to_html(full_html=False)
            
        except Exception as e:
            logger.error(f"Error generating charts: {e}")
        
        return charts
    
    def _generate_recommendations(self, stats: Dict) -> List[str]:
        """توليد توصيات ذكية بناءً على البيانات"""
        recommendations = []
        
        total_leads = stats.get('total_leads', 0)
        contacted = stats.get('contacted_leads', 0)
        response_rate = stats.get('response_rate', 0)
        conversion_rate = stats.get('conversion_rate', 0)
        
        if total_leads == 0:
            recommendations.append("No leads found. Consider expanding your search keywords or targeting.")
        
        if contacted == 0 and total_leads > 0:
            recommendations.append("You have leads but haven't contacted any. Start your outreach campaign!")
        
        if contacted > 0 and response_rate == 0:
            recommendations.append("No responses yet. Consider personalizing your messages more.")
        
        if response_rate > 0 and conversion_rate == 0:
            recommendations.append("Getting responses but no conversions. Review your follow-up strategy.")
        
        if conversion_rate > 15:
            recommendations.append("Excellent conversion rate! Consider scaling this campaign.")
        
        # توصيات بناءً على المنصة الأفضل أداءً
        top_platform = stats.get('top_performing_platform')
        if top_platform:
            recommendations.append(f"Focus more on {top_platform} as it's your best performing platform.")
        
        # توصيات بناءً على جودة العملاء
        if stats.get('avg_intent_score', 0) > 80:
            recommendations.append("High intent leads detected. Prioritize follow-ups with these leads.")
        
        return recommendations[:5]  # إرجاع أفضل 5 توصيات فقط
    
    def _get_top_leads(self, campaign_id: str, limit: int = 10) -> List[Dict]:
        """جلب أفضل العملاء بناءً على النتيجة"""
        try:
            leads = self.db.get_campaign_leads(campaign_id)
            
            # ترتيب حسب النتيجة
            sorted_leads = sorted(leads, key=lambda x: x.intent_score, reverse=True)
            
            top_leads = []
            for lead in sorted_leads[:limit]:
                top_leads.append({
                    'name': lead.name or 'Unknown',
                    'email': lead.email,
                    'score': lead.intent_score,
                    'platform': lead.platform.value,
                    'status': lead.status.value,
                    'last_contacted': lead.last_contacted.isoformat() if lead.last_contacted else None
                })
            
            return top_leads
            
        except Exception as e:
            logger.error(f"Error getting top leads: {e}")
            return []
    
    def _calculate_grade(self, conversion_rate: float) -> str:
        """حساب درجة الأداء"""
        if conversion_rate >= 20:
            return "A+"
        elif conversion_rate >= 15:
            return "A"
        elif conversion_rate >= 10:
            return "B"
        elif conversion_rate >= 5:
            return "C"
        elif conversion_rate >= 1:
            return "D"
        else:
            return "F"
    
    def _get_campaign_by_id(self, campaign_id: str) -> Optional[Campaign]:
        """جلب بيانات الحملة حسب المعرف"""
        # Note: This would typically come from the database
        # For now, return a mock campaign
        return None
    
    def _get_todays_leads_count(self) -> int:
        """عدد العملاء اليوم"""
        # Implementation would query database for today's leads
        return 0
    
    def _get_todays_conversion_rate(self) -> float:
        """معدل التحويل اليوم"""
        return 0.0
    
    def _get_daily_trends(self, days: int) -> List[Dict]:
        """الاتجاهات اليومية"""
        # Generate mock data for now
        trends = []
        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).date()
            trends.append({
                'date': date.isoformat(),
                'leads': 10 + i * 2,
                'conversions': i,
                'response_rate': 15.0 + i
            })
        
        return trends
    
    def _generate_alerts(self) -> List[Dict]:
        """توليد تنبيهات"""
        alerts = []
        
        # Check for campaigns with no leads
        campaigns = self.db.get_active_campaigns()
        for campaign in campaigns:
            stats = self.db.get_campaign_stats(campaign.id)
            if stats.get('total_leads', 0) == 0:
                alerts.append({
                    'type': 'warning',
                    'campaign': campaign.name,
                    'message': 'No leads found for this campaign',
                    'timestamp': datetime.now().isoformat()
                })
        
        return alerts
    
    def _export_to_html(self, report: Dict) -> str:
        """تصدير التقرير إلى HTML"""
        html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Campaign Report - {report.get('campaign_name', 'Unknown')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        .header {{ background: #f4f4f4; padding: 20px; border-radius: 5px; }}
        .summary {{ margin: 20px 0; padding: 20px; background: #e8f4fc; border-radius: 5px; }}
        .chart {{ margin: 20px 0; }}
        .recommendations {{ background: #fff3cd; padding: 20px; border-radius: 5px; }}
        .table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .table th, .table td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        .grade {{ font-size: 24px; font-weight: bold; color: green; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Campaign Report: {report.get('campaign_name', 'Unknown')}</h1>
        <p>Generated: {report.get('generated_at', '')}</p>
    </div>
    
    <div class="summary">
        <h2>Executive Summary</h2>
        <p>Total Leads: {report.get('summary', {}).get('total_leads', 0)}</p>
        <p>Contacted: {report.get('summary', {}).get('contacted', 0)}</p>
        <p>Converted: {report.get('summary', {}).get('converted', 0)}</p>
        <p>Response Rate: {report.get('summary', {}).get('response_rate', '0%')}</p>
        <p>Conversion Rate: {report.get('summary', {}).get('conversion_rate', '0%')}</p>
        <p>Performance Grade: <span class="grade">{report.get('summary', {}).get('performance_grade', 'N/A')}</span></p>
    </div>
    
    <div class="chart">
        <h2>Platform Distribution</h2>
        {report.get('charts', {}).get('platform_distribution', 'No chart data')}
    </div>
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            {"".join(f"<li>{rec}</li>" for rec in report.get('recommendations', []))}
        </ul>
    </div>
    
    <div>
        <h2>Top Performing Leads</h2>
        <table class="table">
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Score</th>
                <th>Platform</th>
                <th>Status</th>
            </tr>
            {"".join(
                f"<tr><td>{lead.get('name')}</td><td>{lead.get('email')}</td><td>{lead.get('score')}</td>"
                f"<td>{lead.get('platform')}</td><td>{lead.get('status')}</td></tr>"
                for lead in report.get('top_leads', [])
            )}
        </table>
    </div>
</body>
</html>
        """
        
        return html_template
    
    def _export_to_pdf(self, report: Dict) -> str:
        """تصدير التقرير إلى PDF"""
        # Note: This would require a PDF generation library like reportlab or weasyprint
        logger.warning("PDF export not implemented. Requires additional libraries.")
        return "PDF export requires additional setup"
    
    def _export_to_csv(self, campaign_id: str) -> str:
        """تصدير بيانات الحملة إلى CSV"""
        try:
            filepath = f"campaign_{campaign_id}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            success = self.db.export_leads_to_csv(campaign_id, filepath)
            
            if success:
                return filepath
            else:
                return "Failed to export CSV"
                
        except Exception as e:
            logger.error(f"Error exporting to CSV: {e}")
            return "Export failed"
