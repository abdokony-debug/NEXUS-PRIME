const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const chalk = require('chalk');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../evidences/reports');
    this.ensureDirectories();
  }

  ensureDirectories() {
    fs.ensureDirSync(this.reportsDir);
    fs.ensureDirSync(path.join(this.reportsDir, 'html'));
    fs.ensureDirSync(path.join(this.reportsDir, 'json'));
    fs.ensureDirSync(path.join(this.reportsDir, 'csv'));
  }

  async generate(options) {
    const { type = 'summary', data = {}, output = null, format = 'html' } = options;

    switch (type) {
      case 'detailed':
        return await this.generateDetailedReport(data, output, format);
      case 'summary':
        return await this.generateSummaryReport(data, output, format);
      case 'analytics':
        return await this.generateAnalyticsReport(data, output, format);
      case 'identity':
        return await this.generateIdentityReport(data, output, format);
      case 'performance':
        return await this.generatePerformanceReport(data, output, format);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  async generateDetailedReport(data, outputPath, format) {
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const defaultPath = path.join(this.reportsDir, 'json', `detailed_${timestamp}.json`);
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'detailed',
        version: '2.0'
      },
      summary: this.calculateSummary(data),
      identities: data.identities || [],
      referrals: data.referrals || [],
      applications: data.applications || [],
      timeline: this.generateTimeline(data),
      statistics: this.calculateStatistics(data),
      systemInfo: this.getSystemInfo()
    };

    if (format === 'html') {
      const htmlReport = this.convertToHTML(report, 'detailed');
      const htmlPath = outputPath || path.join(this.reportsDir, 'html', `detailed_${timestamp}.html`);
      await fs.writeFile(htmlPath, htmlReport);
      return htmlPath;
    } else {
      const jsonPath = outputPath || defaultPath;
      await fs.writeJson(jsonPath, report, { spaces: 2 });
      return jsonPath;
    }
  }

  async generateSummaryReport(data, outputPath, format) {
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    
    const summary = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'summary'
      },
      overview: {
        totalIdentities: data.identities?.length || 0,
        totalReferrals: data.referrals?.length || 0,
        totalApplications: data.applications?.length || 0,
        startTime: this.findStartTime(data),
        endTime: new Date().toISOString(),
        duration: this.calculateDuration(data)
      },
      successRates: {
        referrals: this.calculateSuccessRate(data.referrals),
        applications: this.calculateSuccessRate(data.applications),
        overall: this.calculateOverallSuccessRate(data)
      },
      performance: {
        avgTimePerIdentity: this.calculateAverageTime(data, 'identity'),
        avgTimePerReferral: this.calculateAverageTime(data, 'referral'),
        requestsPerMinute: this.calculateRequestsPerMinute(data)
      },
      topPerformers: this.getTopPerformers(data),
      issues: this.detectIssues(data)
    };

    if (format === 'html') {
      const htmlReport = this.convertToHTML(summary, 'summary');
      const htmlPath = outputPath || path.join(this.reportsDir, 'html', `summary_${timestamp}.html`);
      await fs.writeFile(htmlPath, htmlReport);
      return htmlPath;
    } else {
      const jsonPath = outputPath || path.join(this.reportsDir, 'json', `summary_${timestamp}.json`);
      await fs.writeJson(jsonPath, summary, { spaces: 2 });
      return jsonPath;
    }
  }

  async generateAnalyticsReport(data, outputPath, format) {
    const analytics = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'analytics'
      },
      temporalAnalysis: this.analyzeTemporalPatterns(data),
      behavioralAnalysis: this.analyzeBehavioralPatterns(data),
      successPatterns: this.analyzeSuccessPatterns(data),
      failureAnalysis: this.analyzeFailures(data),
      recommendations: this.generateRecommendations(data),
      predictiveMetrics: this.calculatePredictiveMetrics(data)
    };

    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const jsonPath = outputPath || path.join(this.reportsDir, 'json', `analytics_${timestamp}.json`);
    await fs.writeJson(jsonPath, analytics, { spaces: 2 });
    return jsonPath;
  }

  calculateSummary(data) {
    const identities = data.identities || [];
    const referrals = data.referrals || [];
    const applications = data.applications || [];

    return {
      identities: {
        total: identities.length,
        active: identities.filter(id => id.status === 'active').length,
        completed: identities.filter(id => id.status === 'completed').length,
        failed: identities.filter(id => id.status === 'failed').length
      },
      referrals: {
        total: referrals.length,
        successful: referrals.filter(r => r.success).length,
        failed: referrals.filter(r => !r.success).length,
        successRate: referrals.length > 0 ? 
          (referrals.filter(r => r.success).length / referrals.length * 100).toFixed(2) + '%' : '0%'
      },
      applications: {
        total: applications.length,
        successful: applications.filter(a => a.success).length,
        failed: applications.filter(a => !a.success).length,
        successRate: applications.length > 0 ? 
          (applications.filter(a => a.success).length / applications.length * 100).toFixed(2) + '%' : '0%'
      }
    };
  }

  generateTimeline(data) {
    const events = [];
    
    // جمع أحداث الهويات
    (data.identities || []).forEach(identity => {
      events.push({
        type: 'identity_created',
        timestamp: identity.timestamp,
        identityId: identity.id,
        email: identity.contact.email
      });
    });
    
    // جمع أحداث الإحالات
    (data.referrals || []).forEach(referral => {
      events.push({
        type: referral.success ? 'referral_success' : 'referral_failed',
        timestamp: referral.timestamp,
        site: referral.site,
        identityId: referral.identityId
      });
    });
    
    // فرز الأحداث حسب الوقت
    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  calculateStatistics(data) {
    const referrals = data.referrals || [];
    const applications = data.applications || [];
    
    return {
      referralStats: {
        bySite: this.groupBySite(referrals),
        byHour: this.groupByHour(referrals),
        bySuccess: this.groupBySuccess(referrals)
      },
      applicationStats: {
        byUniversity: this.groupByUniversity(applications),
        byMajor: this.groupByMajor(applications),
        bySuccess: this.groupBySuccess(applications)
      },
      performanceStats: {
        avgResponseTime: this.calculateAverageResponseTime(referrals),
        fastestSite: this.findFastestSite(referrals),
        slowestSite: this.findSlowestSite(referrals)
      }
    };
  }

  groupBySite(referrals) {
    const groups = {};
    referrals.forEach(ref => {
      if (!groups[ref.site]) groups[ref.site] = [];
      groups[ref.site].push(ref);
    });
    
    const result = {};
    Object.keys(groups).forEach(site => {
      const siteRefs = groups[site];
      const successful = siteRefs.filter(r => r.success).length;
      
      result[site] = {
        total: siteRefs.length,
        successful,
        failed: siteRefs.length - successful,
        successRate: (successful / siteRefs.length * 100).toFixed(2) + '%',
        avgDuration: this.calculateAverage(siteRefs.map(r => r.duration))
      };
    });
    
    return result;
  }

  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  convertToHTML(data, reportType) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAHAB System Report - ${reportType.toUpperCase()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
        .header h1 { color: #007bff; margin: 0; }
        .header .subtitle { color: #666; font-size: 14px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .stat-card.success { border-color: #28a745; }
        .stat-card.warning { border-color: #ffc107; }
        .stat-card.danger { border-color: #dc3545; }
        .stat-value { font-size: 32px; font-weight: bold; margin: 10px 0; }
        .stat-label { color: #666; font-size: 14px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #007bff; color: white; }
        .table tr:hover { background: #f5f5f5; }
        .success-badge { background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .fail-badge { background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .chart-container { margin: 30px 0; height: 300px; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 WAHAB STEALTH SYSTEM REPORT</h1>
            <div class="subtitle">${reportType.toUpperCase()} Report - Generated: ${timestamp}</div>
        </div>
        
        ${this.generateHTMLContent(data, reportType)}
        
        <div class="footer">
            <p>Confidential Report - Generated by WAHAB Advanced Simulation System v2.0</p>
            <p>© ${new Date().getFullYear()} WAHAB System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generateHTMLContent(data, reportType) {
    if (reportType === 'summary') {
      return this.generateSummaryHTML(data);
    } else if (reportType === 'detailed') {
      return this.generateDetailedHTML(data);
    }
    return '<p>Report content not available for this type.</p>';
  }

  generateSummaryHTML(data) {
    const summary = this.calculateSummary(data);
    
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Identities</div>
                <div class="stat-value">${summary.identities.total}</div>
                <div>Active: ${summary.identities.active} | Completed: ${summary.identities.completed}</div>
            </div>
            
            <div class="stat-card success">
                <div class="stat-label">Referral Success Rate</div>
                <div class="stat-value">${summary.referrals.successRate}</div>
                <div>Successful: ${summary.referrals.successful}/${summary.referrals.total}</div>
            </div>
            
            <div class="stat-card warning">
                <div class="stat-label">Application Success Rate</div>
                <div class="stat-value">${summary.applications.successRate}</div>
                <div>Successful: ${summary.applications.successful}/${summary.applications.total}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Overall Performance</div>
                <div class="stat-value">${this.calculateOverallScore(data)}/100</div>
                <div>System Health: ${this.getSystemHealth(data)}</div>
            </div>
        </div>
        
        <h2>Recent Activity</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Identity</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${this.generateRecentActivityRows(data)}
            </tbody>
        </table>
    `;
  }

  generateRecentActivityRows(data) {
    const timeline = this.generateTimeline(data);
    const recentEvents = timeline.slice(-10).reverse();
    
    return recentEvents.map(event => `
        <tr>
            <td>${moment(event.timestamp).format('HH:mm:ss')}</td>
            <td>${event.type.replace('_', ' ')}</td>
            <td>${event.identityId ? event.identityId.substring(0, 8) + '...' : 'N/A'}</td>
            <td>
                ${event.type.includes('success') ? 
                  '<span class="success-badge">SUCCESS</span>' : 
                  event.type.includes('failed') ? 
                  '<span class="fail-badge">FAILED</span>' : 
                  '<span>INFO</span>'
                }
            </td>
        </tr>
    `).join('');
  }

  calculateOverallScore(data) {
    const summary = this.calculateSummary(data);
    
    let score = 0;
    if (summary.referrals.total > 0) {
      const referralRate = parseFloat(summary.referrals.successRate);
      score += referralRate * 0.6; // 60% وزن للإحالات
    }
    
    if (summary.applications.total > 0) {
      const applicationRate = parseFloat(summary.applications.successRate);
      score += applicationRate * 0.4; // 40% وزن للتطبيقات
    }
    
    return Math.round(score);
  }

  getSystemHealth(data) {
    const score = this.calculateOverallScore(data);
    
    if (score >= 80) return 'Excellent 🟢';
    if (score >= 60) return 'Good 🟡';
    if (score >= 40) return 'Fair 🟠';
    return 'Poor 🔴';
  }

  printConsoleReport(data) {
    const summary = this.calculateSummary(data);
    
    console.log(chalk.yellow('\n📊 ======= WAHAB SYSTEM REPORT =======\n'));
    
    console.log(chalk.cyan('📈 IDENTITIES:'));
    console.log(`   Total: ${chalk.white(summary.identities.total)}`);
    console.log(`   Active: ${chalk.green(summary.identities.active)}`);
    console.log(`   Completed: ${chalk.blue(summary.identities.completed)}`);
    console.log(`   Failed: ${chalk.red(summary.identities.failed)}`);
    
    console.log(chalk.cyan('\n🎯 REFERRALS:'));
    console.log(`   Total: ${chalk.white(summary.referrals.total)}`);
    console.log(`   Successful: ${chalk.green(summary.referrals.successful)}`);
    console.log(`   Failed: ${chalk.red(summary.referrals.failed)}`);
    console.log(`   Success Rate: ${chalk.yellow(summary.referrals.successRate)}`);
    
    console.log(chalk.cyan('\n🎓 APPLICATIONS:'));
    console.log(`   Total: ${chalk.white(summary.applications.total)}`);
    console.log(`   Successful: ${chalk.green(summary.applications.successful)}`);
    console.log(`   Failed: ${chalk.red(summary.applications.failed)}`);
    console.log(`   Success Rate: ${chalk.yellow(summary.applications.successRate)}`);
    
    console.log(chalk.yellow('\n======================================\n'));
  }

  async generateLiveDashboard() {
    // توليد لوحة تحكم حية
    const dashboardPath = path.join(this.reportsDir, 'html', 'live_dashboard.html');
    
    const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAHAB Live Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        /* إضافة أنماط للوحة التحكم */
    </style>
</head>
<body>
    <div id="dashboard">
        <h1>WAHAB Live Simulation Dashboard</h1>
        <div class="metrics">
            <!-- سيتم تحديثه ديناميكياً -->
        </div>
    </div>
    <script>
        // كود JavaScript للتحديث الحي
    </script>
</body>
</html>
    `;
    
    await fs.writeFile(dashboardPath, dashboardHTML);
    return dashboardPath;
  }
}

module.exports = ReportGenerator;
