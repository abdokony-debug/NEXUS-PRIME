const KonyProcessor = require('./kony-processor');
const { log } = require('./utils/helpers');

class KonyMarketing {
  constructor() {
    this.processor = new KonyProcessor();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      log.warn('النظام يعمل بالفعل');
      return;
    }

    log.info('🚀 بدء تشغيل نظام Kony للتسويق');
    this.isRunning = true;

    try {
      await this.processor.initialize();
      
      // تشغيل الدورة الأولى
      await this.runCampaignCycle();
      
      // جدولة التشغيل الدوري
      this.scheduleCampaigns();
      
    } catch (error) {
      log.error('خطأ في بدء النظام:', error);
      this.isRunning = false;
    }
  }

  async runCampaignCycle() {
    try {
      log.info('🔄 بدء دورة الحملة التسويقية');
      
      const startTime = Date.now();
      const results = await this.processor.runCompleteWorkflow();
      const endTime = Date.now();
      
      const duration = ((endTime - startTime) / 1000 / 60).toFixed(1);
      
      log.info(`✅ اكتملت الدورة في ${duration} دقيقة`);
      log.info(`📊 النتائج: ${results.targets} هدف، ${results.contacted} تم التواصل`);
      
      return results;
      
    } catch (error) {
      log.error('خطأ في دورة الحملة:', error);
      throw error;
    }
  }

  scheduleCampaigns() {
    const intervalHours = parseInt(process.env.KONY_CAMPAIGN_INTERVAL_HOURS) || 6;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    log.info(`⏰ تمت جدولة الحملات كل ${intervalHours} ساعات`);
    
    setInterval(async () => {
      if (this.isRunning) {
        await this.runCampaignCycle();
      }
    }, intervalMs);
  }

  async stop() {
    this.isRunning = false;
    await this.processor.cleanup();
    log.info('🛑 تم إيقاف نظام Kony');
  }

  async getStats() {
    return await this.processor.getStatistics();
  }
}

// تصدير النسخة الأحادية
const konyInstance = new KonyMarketing();
module.exports = konyInstance;
