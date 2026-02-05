async function main() {
  try {
    // ... التهيئة الحالية ...
    
    // جلب المنصات من Google Sheet
    const platforms = await GoogleSheetsManager.getReferralPlatforms();
    
    if (platforms.length === 0) {
      logger.error('No platforms found in Google Sheet');
      return;
    }
    
    logger.info(`Starting processing of ${platforms.length} platforms`);
    
    // توليد الهويات
    const identities = await IdentityManager.generateBatch({
      count: config.batchSize || 5
    });
    
    // معالجة كل هوية مع المنصات
    for (const identity of identities) {
      logger.info(`Processing identity: ${identity.email}`);
      
      const result = await ReferralProcessor.processPlatformReferrals({
        identity,
        browser: await BrowserSimulator.launch(),
        platforms,
        maxReferralsPerPlatform: 5
      });
      
      // حفظ النتائج
      await ResultsManager.saveIdentityResults(identity, result);
      
      // تأخير بين الهويات
      await delay(10000, 30000);
    }
    
    // إنشاء التقرير النهائي
    await ReportGenerator.generatePlatformReport(platforms);
    
    logger.info('Platform processing completed successfully');
    
  } catch (error) {
    logger.error('Main execution failed', error);
  }
}
