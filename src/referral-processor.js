async processPlatformReferrals(options) {
  const {
    identity,
    browser,
    platforms,
    maxReferralsPerPlatform = 5
  } = options;
  
  const results = [];
  
  for (const platform of platforms) {
    // تخطي المنصات المكتملة
    if (platform.status === 'Completed') {
      logger.info(`Skipping ${platform.platform} - already completed`);
      continue;
    }
    
    logger.info(`Processing ${platform.platform} - ${platform.link}`);
    
    try {
      const page = await browser.context.newPage();
      
      // انتقل إلى رابط الإحالة
      await page.goto(platform.link, { waitUntil: 'networkidle' });
      
      // خذ لقطة شاشة كدليل
      const screenshot = await this.takeScreenshot(page, platform.platform);
      
      // ابحث عن علامات النجاح
      const success = await this.checkForSuccess(page, platform.platform);
      
      // سجل النتيجة
      const result = {
        platform: platform.platform,
        link: platform.link,
        success,
        screenshot: screenshot.filename,
        identity: identity.email,
        timestamp: new Date().toISOString()
      };
      
      results.push(result);
      
      // تحديث الحالة في Google Sheet إذا نجحت
      if (success) {
        await this.updatePlatformStatus(platform, 'Completed', identity.email);
      }
      
      await page.close();
      
      // تأخير بين المنصات
      await this.delay(3000, 8000);
      
    } catch (error) {
      logger.error(`Failed to process ${platform.platform}`, error);
      
      results.push({
        platform: platform.platform,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.updatePlatformStatus(platform, 'Failed', error.message);
    }
  }
  
  return results;
}
