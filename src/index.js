// index.js - الدمج الكامل
require('dotenv').config();

// تحميل كل المكونات الموجودة
const StealthEngine = require('./stealth-engine');
const ProxyRotator = require('./proxy-rotator');
const BrowserSimulator = require('./browser-simulator');
const PlatformProcessor = require('./platform-processor');
const IdentityManager = require('./identity-manager');
const GoogleSheetsManager = require('./GoogleSheetsManager');
const ReportGenerator = require('./report-generator');

// نظام Kony الجديد
const KonyProcessor = require('./kony-processor');

class IntegratedKonySystem {
  constructor() {
    // المكونات القديمة
    this.stealth = new StealthEngine();
    this.proxy = new ProxyRotator();
    this.browser = new BrowserSimulator();
    this.platforms = new PlatformProcessor();
    this.identity = new IdentityManager();
    this.sheets = new GoogleSheetsManager();
    this.reporter = new ReportGenerator();
    
    // النظام الجديد
    this.kony = new KonyProcessor();
    
    this.config = this.loadConfig();
  }

  async initialize() {
    console.log('Initializing Integrated Kony System...');
    
    // تهيئة المكونات القديمة
    await this.stealth.initialize();
    await this.proxy.initialize();
    await this.browser.setup();
    await this.identity.loadProfiles();
    await this.sheets.connect();
    
    // تهيئة النظام الجديد مع المكونات القديمة
    this.kony.setComponents({
      stealth: this.stealth,
      proxy: this.proxy,
      browser: this.browser,
      sheets: this.sheets,
      reporter: this.reporter
    });
    
    await this.kony.initialize();
    
    console.log('All components initialized successfully');
  }

  loadConfig() {
    try {
      return require('./config');
    } catch {
      return {
        campaign: {
          mode: 'standard',
          batchSize: 10,
          region: 'global'
        },
        platforms: ['reddit', 'twitter', 'linkedin'],
        stealth: true,
        proxyRotation: true
      };
    }
  }

  async runCampaign() {
    console.log('Starting integrated campaign...');
    
    // استخدام stealth engine للبحث
    const searchResults = await this.searchWithStealth();
    
    // استخدام identity manager لتحسين النتائج
    const enrichedTargets = await this.enrichTargets(searchResults);
    
    // تشغيل نظام Kony مع البيانات المحسنة
    const results = await this.kony.processCampaign(enrichedTargets);
    
    // توليد تقرير باستخدام النظام القديم
    await this.generateComprehensiveReport(results);
    
    return results;
  }

  async searchWithStealth() {
    console.log('Searching with stealth engine...');
    
    // استخدام browser simulator مع proxy rotator
    const browser = await this.browser.createBrowser({
      stealth: true,
      proxy: await this.proxy.getNextProxy()
    });
    
    const page = await browser.newPage();
    
    // استخدام platform processor للبحث في كل منصة
    const platforms = this.config.platforms || ['reddit', 'twitter'];
    const allResults = [];
    
    for (const platform of platforms) {
      console.log(`Searching ${platform}...`);
      
      const results = await this.platforms.search(platform, {
        keywords: this.config.keywords,
        region: this.config.campaign.region,
        limit: this.config.campaign.batchSize
      });
      
      allResults.push(...results);
      
      // تغيير الهوية بين المنصات
      await this.identity.rotate();
      await this.proxy.rotate();
    }
    
    await browser.close();
    return allResults;
  }

  async enrichTargets(targets) {
    console.log('Enriching targets with identity manager...');
    
    return targets.map(target => {
      // إضافة معلومات من identity manager
      const profile = this.identity.getCurrentProfile();
      
      return {
        ...target,
        enrichedData: {
          browserFingerprint: profile.browserFingerprint,
          userAgent: profile.userAgent,
          timezone: profile.timezone,
          language: profile.language
        },
        contactConfidence: this.calculateContactConfidence(target)
      };
    });
  }

  calculateContactConfidence(target) {
    let confidence = target.intentScore || 50;
    
    // عوامل زيادة الثقة
    if (target.platform === 'reddit') confidence += 10;
    if (target.activityScore > 70) confidence += 15;
    if (target.hasRecentPosts) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  async generateComprehensiveReport(results) {
    console.log('Generating comprehensive report...');
    
    // استخدام report generator القديم
    const report = await this.reporter.generate({
      campaignId: this.kony.campaignId,
      results: results,
      stealthMetrics: this.stealth.getMetrics(),
      proxyMetrics: this.proxy.getMetrics(),
      browserMetrics: this.browser.getMetrics(),
      timestamp: new Date().toISOString()
    });
    
    // حفظ في Google Sheets
    await this.sheets.saveReport(report);
    
    // حفظ محلي
    await this.reporter.saveToFile(report, 'final-campaign-report.json');
    
    return report;
  }

  async cleanup() {
    console.log('Cleaning up all components...');
    
    await this.stealth.cleanup();
    await this.proxy.cleanup();
    await this.browser.cleanup();
    await this.kony.cleanup();
    
    console.log('Cleanup completed');
  }
}

// تشغيل النظام
async function main() {
  const system = new IntegratedKonySystem();
  
  try {
    await system.initialize();
    const results = await system.runCampaign();
    
    console.log('\n=== Campaign Completed Successfully ===');
    console.log('Integrated system leveraged all components:');
    console.log('- Stealth Engine:', system.stealth.isActive() ? 'Active' : 'Inactive');
    console.log('- Proxy Rotator:', system.proxy.getProxyCount(), 'proxies');
    console.log('- Browser Simulator:', system.browser.getStats().sessions, 'sessions');
    console.log('- Platform Processor:', system.platforms.getProcessedCount(), 'platforms processed');
    console.log('- Targets Contacted:', results.contacted || 0);
    console.log('=======================================\n');
    
    await system.cleanup();
    process.exit(0);
    
  } catch (error) {
    console.error('Integrated system error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = IntegratedKonySystem;
