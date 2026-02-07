// index.js - Integrated Kony System
require('dotenv').config();

// Importing necessary components
const StealthEngine = require('./stealth-engine');
const ProxyRotator = require('./proxy-rotator');
const BrowserSimulator = require('./browser-simulator');
const PlatformProcessor = require('./platform-processor');
const IdentityManager = require('./identity-manager');
const GoogleSheetsManager = require('./GoogleSheetsManager');
const ReportGenerator = require('./report-generator');
const KonyProcessor = require('./kony-processor');

class IntegratedKonySystem {
  constructor() {
    this.stealth = new StealthEngine();
    this.proxy = new ProxyRotator();
    this.browser = new BrowserSimulator();
    this.platforms = new PlatformProcessor();
    this.identity = new IdentityManager();
    this.sheets = new GoogleSheetsManager();
    this.reporter = new ReportGenerator();
    this.kony = new KonyProcessor();
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      return require('./config');
    } catch (error) {
      console.error('Failed to load config file. Using default settings.', error);
      return {
        campaign: {
          mode: 'standard',
          batchSize: 10,
          region: 'global',
          keywords: []
        },
        platforms: ['reddit', 'twitter', 'linkedin'],
        stealth: true,
        proxyRotation: true
      };
    }
  }

  async initialize() {
    console.log('Initializing Integrated Kony System...');
    try {
      await Promise.all([
        this.stealth.initialize(),
        this.proxy.initialize(),
        this.browser.setup(),
        this.identity.loadProfiles(),
        this.sheets.connect()
      ]);

      this.kony.setComponents({
        stealth: this.stealth,
        proxy: this.proxy,
        browser: this.browser,
        sheets: this.sheets,
        reporter: this.reporter
      });

      await this.kony.initialize();
      console.log('All components initialized successfully');
    } catch (error) {
      console.error('Error initializing components:', error);
      throw error;
    }
  }

  async runCampaign() {
    console.log('Starting integrated campaign...');
    try {
      const searchResults = await this.searchWithStealth();
      const enrichedTargets = await this.enrichTargets(searchResults);
      const results = await this.kony.processCampaign(enrichedTargets);
      await this.generateComprehensiveReport(results);
      return results;
    } catch (error) {
      console.error('Error running campaign:', error);
      throw error;
    }
  }

  async searchWithStealth() {
    console.log('Searching with stealth engine...');
    let browser;
    try {
      browser = await this.browser.createBrowser({
        stealth: true,
        proxy: await this.proxy.getNextProxy()
      });

      const page = await browser.newPage();
      const platforms = this.config.platforms || ['reddit', 'twitter'];
      const allResults = [];

      for (const platform of platforms) {
        console.log(`Searching ${platform}...`);
        const results = await this.platforms.search(platform, {
          keywords: this.config.campaign.keywords,
          region: this.config.campaign.region,
          limit: this.config.campaign.batchSize
        });
        allResults.push(...results);

        await this.identity.rotate();
        await this.proxy.rotate();
      }

      return allResults;
    } catch (error) {
      console.error('Error during stealth search:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async enrichTargets(targets) {
    console.log('Enriching targets with identity manager...');
    return targets.map(target => {
      const profile = this.identity.getCurrentProfile() || {};
      return {
        ...target,
        enrichedData: {
          browserFingerprint: profile.browserFingerprint || '',
          userAgent: profile.userAgent || '',
          timezone: profile.timezone || '',
          language: profile.language || ''
        },
        contactConfidence: this.calculateContactConfidence(target)
      };
    });
  }

  calculateContactConfidence(target) {
    let confidence = target.intentScore || 50;
    if (target.platform === 'reddit') confidence += 10;
    if (target.activityScore > 70) confidence += 15;
    if (target.hasRecentPosts) confidence += 10;

    return Math.min(confidence, 100);
  }

  async generateComprehensiveReport(results) {
    console.log('Generating comprehensive report...');
    try {
      const report = await this.reporter.generate({
        campaignId: this.kony.campaignId,
        results: results,
        stealthMetrics: this.stealth.getMetrics(),
        proxyMetrics: this.proxy.getMetrics(),
        browserMetrics: this.browser.getMetrics(),
        timestamp: new Date().toISOString()
      });

      await this.sheets.saveReport(report);
      await this.reporter.saveToFile(report, 'final-campaign-report.json');

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async cleanup() {
    console.log('Cleaning up all components...');
    try {
      await Promise.all([
        this.stealth.cleanup(),
        this.proxy.cleanup(),
        this.browser.cleanup(),
        this.kony.cleanup()
      ]);
      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Main execution
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
    await system.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = IntegratedKonySystem;
