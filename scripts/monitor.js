#!/usr/bin/env node

const GoogleSheetsManager = require('../src/google-sheets-manager');
const logger = require('../src/logger');
const config = require('../config/sites-custom');

async function monitorSheet() {
  logger.info('👁️  Monitoring Google Sheet for changes...');
  
  let lastPlatforms = [];
  
  while (true) {
    try {
      const platforms = await GoogleSheetsManager.getDataFromSheet(config.sheetName);
      
      // التحقق من التغييرات
      if (JSON.stringify(platforms) !== JSON.stringify(lastPlatforms)) {
        logger.info('📝 Sheet has been updated!');
        
        // التحقق من المنصات الجديدة
        const newPlatforms = platforms.filter(newP => 
          !lastPlatforms.some(oldP => oldP.Platform_Name === newP.Platform_Name)
        );
        
        if (newPlatforms.length > 0) {
          logger.info(`🎯 New platforms detected: ${newPlatforms.length}`);
          newPlatforms.forEach(p => {
            logger.info(`  ➕ ${p.Platform_Name} - ${p.Link_URL}`);
          });
        }
        
        lastPlatforms = platforms;
      }
      
      // انتظار قبل الفحص التالي
      await new Promise(resolve => setTimeout(resolve, 30000)); // كل 30 ثانية
      
    } catch (error) {
      logger.error('Error monitoring sheet:', error);
      await new Promise(resolve => setTimeout(resolve, 60000)); // انتظار أطول عند الخطأ
    }
  }
}

if (require.main === module) {
  monitorSheet().catch(console.error);
}
