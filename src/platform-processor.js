const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const config = require('../config/sites-custom');
const GoogleSheetsManager = require('./google-sheets-manager');

class PlatformProcessor {
  constructor() {
    this.results = [];
    this.stats = {
      totalPlatforms: 0,
      successfulRegistrations: 0,
      failedRegistrations: 0,
      totalAccountsCreated: 0
    };
  }

  async loadPlatformsFromSheet() {
    try {
      const sheetName = config.sheetName;
      logger.info(`📄 Loading platforms from sheet: ${sheetName}`);
      
      // جلب البيانات من الورقة
      const platformsData = await GoogleSheetsManager.getDataFromSheet(sheetName);
      
      // تحويل إلى هيكل البيانات الخاص
      const platforms = [];
      
      platformsData.forEach((row, index) => {
        // تخطي الصفوف الفارغة
        if (!row.Platform_Name || !row.Link_URL) return;
        
        platforms.push({
          index: index + config.tableStructure.startRow, // الصف في الشيت
          name: row.Platform_Name.trim(),
          link: row.Link_URL.trim(),
          targetCount: parseInt(row.Added_Count) || 5,
          currentCount: 0,
          status: row.Status || 'Pending',
          type: this.getPlatformType(row.Platform_Name.trim()),
          selectors: this.getPlatformSelectors(row.Platform_Name.trim())
        });
      });
      
      this.stats.totalPlatforms = platforms.length;
      logger.info(`✅ Loaded ${platforms.length} platforms from sheet`);
      
      return platforms;
      
    } catch (error) {
      logger.error('Error loading platforms from sheet', error);
      return [];
    }
  }

  getPlatformType(platformName) {
    const normalizedName = platformName.toLowerCase();
    
    if (normalizedName.includes('game')) return 'gaming';
    if (normalizedName.includes('cash')) return 'reward';
    if (normalizedName.includes('swag')) return 'rewards';
    if (normalizedName.includes('bux')) return 'cashback';
    if (normalizedName.includes('pawn')) return 'survey';
    
    return 'general';
  }

  getPlatformSelectors(platformName) {
    return config.platformTypes[platformName]?.selectors || {
      emailField: 'input[type="email"]',
      passwordField: 'input[type="password"]',
      submitButton: 'button[type="submit"], input[type="submit"]',
      successIndicator: '.success, .welcome, h1:contains("Welcome")'
    };
  }

  async processPlatform(platform, identity, browser) {
    const result = {
      platform: platform.name,
      link: platform.link,
      identity: identity.email,
      startTime: new Date().toISOString(),
      success: false,
      error: null,
      screenshot: null
    };
    
    const page = await browser.context.newPage();
    
    try {
      logger.info(`🎮 Processing platform: ${platform.name}`);
      logger.info(`👤 Using identity: ${identity.email}`);
      logger.info(`🔗 Platform URL: ${platform.link}`);
      
      // الانتقال إلى رابط المنصة
      await page.goto(platform.link, {
        waitUntil: 'networkidle',
        timeout: config.execution.timeoutPerPlatform
      });
      
      // الانتظار للتحميل
      await page.waitForTimeout(2000);
      
      // التقاط لقطة للصفحة الأصلية
      const initialScreenshot = await this.captureScreenshot(page, 'initial', platform.name);
      
      // البحث عن نموذج التسجيل
      const registrationSuccessful = await this.handleRegistration(page, platform, identity);
      
      if (registrationSuccessful) {
        result.success = true;
        result.screenshot = await this.captureScreenshot(page, 'success', platform.name);
        
        // زيادة العداد
        platform.currentCount++;
        this.stats.successfulRegistrations++;
        this.stats.totalAccountsCreated++;
        
        logger.success(`✅ Successfully registered on ${platform.name} with ${identity.email}`);
      } else {
        result.error = 'Registration failed';
        logger.error(`❌ Failed to register on ${platform.name}`);
      }
      
    } catch (error) {
      result.error = error.message;
      logger.error(`💥 Error processing ${platform.name}:`, error);
      
      // التقاط لقطة عند الخطأ
      result.screenshot = await this.captureScreenshot(page, 'error', platform.name);
      
    } finally {
      result.endTime = new Date().toISOString();
      await page.close();
      
      // إضافة النتيجة
      this.results.push(result);
      
      // تحديث الشيت
      await this.updateSheetStatus(platform, result);
      
      return result;
    }
  }

  async handleRegistration(page, platform, identity) {
    try {
      // البحث عن حقل البريد الإلكتروني
      const emailField = await this.findElement(page, platform.selectors.emailField);
      if (emailField) {
        await emailField.type(identity.email, { delay: 100 });
        logger.info(`📧 Filled email: ${identity.email}`);
      }
      
      // البحث عن حقل كلمة المرور
      const passwordField = await this.findElement(page, platform.selectors.passwordField);
      if (passwordField) {
        await passwordField.type(identity.password, { delay: 100 });
        logger.info('🔑 Filled password');
      }
      
      // البحث عن أزرار التسجيل
      const signupSelectors = [
        platform.selectors.signupButton,
        platform.selectors.submitButton,
        platform.selectors.registerLink,
        platform.selectors.joinNow,
        platform.selectors.continueButton,
        'button:contains("Sign Up")',
        'button:contains("Register")',
        'button:contains("Join")',
        'a:contains("Sign Up")',
        'a:contains("Register")'
      ];
      
      for (const selector of signupSelectors) {
        if (selector) {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            logger.info(`🖱️ Clicked registration button: ${selector}`);
            await page.waitForTimeout(2000);
            break;
          }
        }
      }
      
      // التحقق من النجاح
      await page.waitForTimeout(3000);
      
      // البحث عن مؤشرات النجاح
      const success = await this.checkSuccess(page, platform);
      
      if (success) {
        return true;
      } else {
        // محاولة بديلة: التحقق من تغيير URL
        const currentUrl = page.url();
        if (currentUrl.includes('welcome') || currentUrl.includes('dashboard') || currentUrl.includes('account')) {
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      logger.error('Error in registration process:', error);
      return false;
    }
  }

  async findElement(page, selector) {
    if (!selector) return null;
    
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return await page.$(selector);
    } catch (error) {
      return null;
    }
  }

  async checkSuccess(page, platform) {
    // التحقق من أنماط النجاح في النص
    const content = await page.content();
    const lowerContent = content.toLowerCase();
    
    for (const pattern of config.successPatterns) {
      if (lowerContent.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    
    // التحقق من عناصر النجاح المحددة
    if (platform.selectors.successIndicator) {
      try {
        const successElement = await page.$(platform.selectors.successIndicator);
        if (successElement && await successElement.isVisible()) {
          return true;
        }
      } catch (error) {
        // تجاهل الخطأ والمتابعة
      }
    }
    
    return false;
  }

  async captureScreenshot(page, type, platformName) {
    const screenshotDir = path.join(__dirname, '../evidences', config.logging.screenshotDir);
    await fs.ensureDir(screenshotDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safePlatformName = platformName.replace(/[^a-z0-9]/gi, '_');
    const filename = `${safePlatformName}_${type}_${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true
    });
    
    logger.info(`📸 Screenshot saved: ${filename}`);
    return filename;
  }

  async updateSheetStatus(platform, result) {
    try {
      const status = result.success ? '✅ Completed' : '❌ Failed';
      const notes = result.success 
        ? `Registered with: ${result.identity}`
        : `Error: ${result.error}`;
      
      await GoogleSheetsManager.updateCell(
        config.sheetName,
        platform.index,
        'Status',
        status
      );
      
      // إضافة ملاحظات إذا كان هناك عمود إضافي
      await GoogleSheetsManager.updateCell(
        config.sheetName,
        platform.index,
        'Notes',
        notes
      );
      
      logger.info(`📊 Updated sheet status for ${platform.name}: ${status}`);
      
    } catch (error) {
      logger.error(`Failed to update sheet status for ${platform.name}`, error);
    }
  }

  async saveResults() {
    const resultsDir = path.join(__dirname, '../evidences/results');
    await fs.ensureDir(resultsDir);
    
    // حفظ النتائج كـ JSON
    const jsonFile = path.join(resultsDir, `platform_results_${Date.now()}.json`);
    await fs.writeJson(jsonFile, {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalPlatforms: this.stats.totalPlatforms
      },
      stats: this.stats,
      results: this.results
    }, { spaces: 2 });
    
    // حفظ النتائج كـ CSV
    const csvFile = path.join(resultsDir, `platform_results_${Date.now()}.csv`);
    const csvHeaders = ['Platform', 'Identity', 'Status', 'Time', 'Screenshot'];
    const csvRows = this.results.map(r => [
      r.platform,
      r.identity,
      r.success ? 'Success' : 'Failed',
      r.endTime,
      r.screenshot || ''
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    await fs.writeFile(csvFile, csvContent);
    
    logger.info(`📁 Results saved to: ${jsonFile} and ${csvFile}`);
    
    return {
      jsonFile,
      csvFile,
      stats: this.stats
    };
  }

  async generateReport() {
    const report = {
      title: 'Platform Registration Report',
      date: new Date().toISOString(),
      summary: {
        totalPlatformsProcessed: this.stats.totalPlatforms,
        successfulRegistrations: this.stats.successfulRegistrations,
        failedRegistrations: this.stats.failedRegistrations,
        successRate: this.stats.totalPlatforms > 0 
          ? ((this.stats.successfulRegistrations / this.stats.totalPlatforms) * 100).toFixed(2) + '%'
          : '0%'
      },
      platformDetails: this.results.map(r => ({
        platform: r.platform,
        identity: r.identity,
        status: r.success ? '✅ Success' : '❌ Failed',
        time: r.endTime,
        screenshot: r.screenshot,
        error: r.error
      }))
    };
    
    // حفظ التقرير
    const reportDir = path.join(__dirname, '../reports');
    await fs.ensureDir(reportDir);
    
    const reportFile = path.join(reportDir, `platform_report_${Date.now()}.json`);
    await fs.writeJson(reportFile, report, { spaces: 2 });
    
    // إنشاء تقرير HTML
    await this.generateHTMLReport(report);
    
    logger.info(`📊 Report generated: ${reportFile}`);
    
    return report;
  }

  async generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAHAB Platform Registration Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #007bff; color: white; }
        .status-success { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 WAHAB Platform Registration Report</h1>
            <p>Generated: ${new Date(report.date).toLocaleString()}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div>Total Platforms</div>
                <div class="stat-value">${report.summary.totalPlatformsProcessed}</div>
            </div>
            <div class="stat-card">
                <div>Successful</div>
                <div class="stat-value success">${report.summary.successfulRegistrations}</div>
            </div>
            <div class="stat-card">
                <div>Failed</div>
                <div class="stat-value failed">${report.summary.failedRegistrations}</div>
            </div>
            <div class="stat-card">
                <div>Success Rate</div>
                <div class="stat-value">${report.summary.successRate}</div>
            </div>
        </div>
        
        <h2>Platform Details</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Platform</th>
                    <th>Identity</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Screenshot</th>
                </tr>
            </thead>
            <tbody>
                ${report.platformDetails.map(p => `
                <tr>
                    <td>${p.platform}</td>
                    <td>${p.identity}</td>
                    <td class="${p.status.includes('Success') ? 'status-success' : 'status-failed'}">
                        ${p.status}
                    </td>
                    <td>${new Date(p.time).toLocaleTimeString()}</td>
                    <td>${p.screenshot ? '📸 Available' : ''}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
    
    const reportDir = path.join(__dirname, '../reports');
    const htmlFile = path.join(reportDir, `platform_report_${Date.now()}.html`);
    await fs.writeFile(htmlFile, html);
    
    logger.info(`📄 HTML report generated: ${htmlFile}`);
  }
}

module.exports = new PlatformProcessor();
