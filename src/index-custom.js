#!/usr/bin/env node

const PlatformProcessor = require('./platform-processor');
const IdentityManager = require('./identity-manager');
const BrowserSimulator = require('./browser-simulator');
const GoogleSheetsManager = require('./google-sheets-manager');
const logger = require('./logger');
const config = require('../config/sites-custom');

async function main() {
  logger.info('🚀 Starting WAHAB Platform Registration System');
  logger.info('='.repeat(50));
  
  try {
    // 1. تهيئة Google Sheets
    logger.info('🔗 Connecting to Google Sheets...');
    await GoogleSheetsManager.initialize();
    logger.success('✅ Google Sheets connected');
    
    // 2. تحميل المنصات من الشيت
    logger.info('📄 Loading platforms from Google Sheet...');
    const platforms = await PlatformProcessor.loadPlatformsFromSheet();
    
    if (platforms.length === 0) {
      logger.error('❌ No platforms found in the sheet');
      return;
    }
    
    logger.info(`✅ Loaded ${platforms.length} platforms`);
    
    // 3. توليد الهويات
    logger.info('👤 Generating identities...');
    const identities = await IdentityManager.generateBatch({
      count: 5, // كما في Added_Count
      country: 'US',
      ageRange: [18, 40]
    });
    
    logger.info(`✅ Generated ${identities.length} identities`);
    
    // 4. معالجة كل منصة
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      
      logger.info(`\n🎯 Processing platform ${i + 1}/${platforms.length}: ${platform.name}`);
      logger.info(`🔗 URL: ${platform.link}`);
      logger.info(`🎯 Target accounts: ${platform.targetCount}`);
      
      // إعادة ضبط العداد
      platform.currentCount = 0;
      
      // معالجة المنصة مع هويات مختلفة
      for (let j = 0; j < Math.min(identities.length, platform.targetCount); j++) {
        const identity = identities[j];
        
        logger.info(`\n👤 Attempt ${j + 1}/${platform.targetCount} with identity: ${identity.email}`);
        
        // إنشاء متصفح جديد لكل محاولة
        const browser = await BrowserSimulator.launch({
          stealthLevel: 'high',
          headless: true
        });
        
        // معالجة المنصة
        const result = await PlatformProcessor.processPlatform(platform, identity, browser);
        
        // إغلاق المتصفح
        await browser.browser.close();
        
        // تأخير بين المحاولات
        if (j < Math.min(identities.length, platform.targetCount) - 1) {
          const delay = Math.floor(Math.random() * 5000) + 3000; // 3-8 ثواني
          logger.info(`⏳ Waiting ${delay / 1000} seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // تأخير بين المنصات
      if (i < platforms.length - 1) {
        const delay = Math.floor(Math.random() * 10000) + 5000; // 5-15 ثانية
        logger.info(`\n⏳ Waiting ${delay / 1000} seconds before next platform...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 5. حفظ النتائج والتقارير
    logger.info('\n📁 Saving results and generating reports...');
    await PlatformProcessor.saveResults();
    await PlatformProcessor.generateReport();
    
    // 6. عرض الإحصائيات النهائية
    logger.info('\n📊 ====== FINAL STATISTICS ======');
    logger.info(`Total Platforms: ${PlatformProcessor.stats.totalPlatforms}`);
    logger.info(`Successful Registrations: ${PlatformProcessor.stats.successfulRegistrations}`);
    logger.info(`Failed Registrations: ${PlatformProcessor.stats.failedRegistrations}`);
    logger.info(`Total Accounts Created: ${PlatformProcessor.stats.totalAccountsCreated}`);
    logger.info(`Success Rate: ${((PlatformProcessor.stats.successfulRegistrations / PlatformProcessor.stats.totalPlatforms) * 100).toFixed(2)}%`);
    logger.info('='.repeat(35));
    
    logger.success('\n🎉 Platform registration process completed successfully!');
    
  } catch (error) {
    logger.error('💥 Fatal error in main process:', error);
    process.exit(1);
  }
}

// تنفيذ النظام
if (require.main === module) {
  main().catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = main;
