class PlatformReportGenerator {
  static async generatePlatformReport(platforms) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalPlatforms: platforms.length,
        completed: platforms.filter(p => p.status === 'Completed').length,
        pending: platforms.filter(p => p.status === 'Pending').length,
        failed: platforms.filter(p => p.status === 'Failed').length
      },
      platforms: platforms.map(p => ({
        name: p.platform,
        link: p.link,
        status: p.status,
        count: p.count
      }))
    };
    
    // حفظ التقرير محلياً
    const fs = require('fs-extra');
    const path = require('path');
    
    const reportDir = path.join(__dirname, '../reports');
    await fs.ensureDir(reportDir);
    
    const reportFile = path.join(reportDir, `platform-report-${Date.now()}.json`);
    await fs.writeJson(reportFile, report, { spaces: 2 });
    
    // رفع التقرير إلى Google Sheets إذا كان ذلك ممكناً
    try {
      await GoogleSheetsManager.saveReport(report);
    } catch (error) {
      logger.error('Failed to upload report to Google Sheets', error);
    }
    
    return report;
  }
}
