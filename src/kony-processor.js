const GoogleSheetsManager = require('./google-sheets');
const SearcherFactory = require('./searchers/general-searcher');
const MessageGenerator = require('./messaging/message-generator');
const MessageSender = require('./messaging/message-sender');
const LinkTracker = require('./tracking/link-tracker');
const { log, delay } = require('./utils/helpers');
const config = require('./utils/config');

class KonyProcessor {
  constructor() {
    this.sheets = null;
    this.searcher = null;
    this.messageGen = null;
    this.messageSender = null;
    this.tracker = null;
    this.currentCampaign = null;
  }

  async initialize() {
    log.info('🔧 تهيئة نظام Kony...');
    
    // تهيئة Google Sheets
    this.sheets = new GoogleSheetsManager();
    await this.sheets.initialize();
    
    // تهيئة محرك البحث
    this.searcher = new SearcherFactory();
    
    // تهيئة توليد الرسائل
    this.messageGen = new MessageGenerator();
    
    // تهيئة إرسال الرسائل
    this.messageSender = new MessageSender();
    
    // تهيئة التتبع
    this.tracker = new LinkTracker();
    
    log.info('✅ تمت تهيئة النظام');
  }

  async runCompleteWorkflow() {
    const campaignId = `CAMP-${Date.now()}`;
    this.currentCampaign = {
      id: campaignId,
      startTime: new Date(),
      targets: [],
      stats: {
        found: 0,
        contacted: 0,
        responded: 0,
        clicked: 0,
        purchased: 0
      }
    };
    
    log.info(`🎯 بدء الحملة ${campaignId}`);
    
    // 1. قراءة المنتجات
    const products = await this.readProducts();
    
    // 2. معالجة كل منتج
    for (const product of products) {
      await this.processProduct(product, campaignId);
    }
    
    // 3. تحديث الإحصائيات
    await this.updateStatistics();
    
    // 4. إنشاء التقرير
    const report = await this.generateReport();
    
    this.currentCampaign.endTime = new Date();
    this.currentCampaign.report = report;
    
    log.info(`✅ اكتملت الحملة ${campaignId}`);
    
    return report;
  }

  async readProducts() {
    log.info('📖 قراءة المنتجات من الشيت...');
    
    const products = await this.sheets.getProducts();
    
    if (products.length === 0) {
      log.warn('⚠️  لم يتم العثور على منتجات في الشيت');
    }
    
    log.info(`📦 تم العثور على ${products.length} منتج`);
    
    return products.map(p => ({
      name: p[0] || '',        // A: Product_Name
      keywords: (p[1] || '').split(',').map(k => k.trim()), // B: Keywords
      url: p[2] || '',         // C: Product_URL
      region: p[3] || 'Global' // D: Region
    })).filter(p => p.name && p.url);
  }

  async processProduct(product, campaignId) {
    log.info(`🎯 معالجة المنتج: ${product.name}`);
    
    // البحث عن أهداف
    const targets = await this.findTargets(product);
    this.currentCampaign.stats.found += targets.length;
    
    if (targets.length === 0) {
      log.warn(`⚠️  لم يتم العثور على أهداف للمنتج: ${product.name}`);
      return;
    }
    
    log.info(`🔍 تم العثور على ${targets.length} هدف للمنتج ${product.name}`);
    
    // مراسلة الأهداف
    for (const target of targets) {
      await this.contactTarget(target, product, campaignId);
      await delay(config.DELAY_BETWEEN_MESSAGES);
    }
  }

  async findTargets(product) {
    const { keywords, region } = product;
    const maxTargets = config.MAX_TARGETS_PER_PRODUCT;
    
    const allTargets = [];
    
    // البحث في جميع المنصات
    const platforms = ['reddit', 'twitter', 'linkedin', 'instagram', 'pinterest'];
    
    for (const platform of platforms) {
      try {
        const platformTargets = await this.searcher.search(platform, {
          keywords,
          region,
          limit: Math.floor(maxTargets / platforms.length)
        });
        
        // تصفية حسب درجة النية
        const filteredTargets = platformTargets.filter(t => 
          t.intentScore >= config.MIN_INTENT_SCORE
        );
        
        allTargets.push(...filteredTargets);
        
        log.info(`📍 ${platform}: ${filteredTargets.length} هدف`);
        
        if (allTargets.length >= maxTargets) {
          break;
        }
        
      } catch (error) {
        log.error(`❌ خطأ في البحث على ${platform}:`, error.message);
      }
    }
    
    return allTargets.slice(0, maxTargets);
  }

  async contactTarget(target, product, campaignId) {
    const targetId = `T-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      // توليد رسالة مخصصة
      const message = await this.messageGen.createMessage(target, product);
      
      // إنشاء رابط تتبع
      const trackingLink = await this.tracker.createLink(product.url, {
        campaignId,
        targetId,
        product: product.name
      });
      
      // إضافة رابط التتبع للرسالة
      const finalMessage = message.replace('{PRODUCT_URL}', trackingLink.shortUrl);
      
      // إرسال الرسالة
      const sent = await this.messageSender.send(target, finalMessage);
      
      if (sent) {
        this.currentCampaign.stats.contacted++;
        
        // تسجيل في الشيت
        await this.sheets.addTarget({
          targetId,
          productName: product.name,
          keywords: product.keywords.join(', '),
          productUrl: product.url,
          region: product.region,
          platform: target.platform,
          username: target.username,
          profileUrl: target.profileUrl,
          intentScore: target.intentScore,
          contactMethod: target.contactMethod,
          contactInfo: target.contactInfo,
          messageContent: finalMessage,
          campaignId,
          status: 'CONTACTED'
        });
        
        log.info(`📨 تم إرسال رسالة إلى ${target.username} على ${target.platform}`);
        
        // إضافة للتتبع
        this.tracker.trackMessageSent(targetId, trackingLink.id);
        
      } else {
        log.warn(`⚠️  فشل إرسال الرسالة إلى ${target.username}`);
      }
      
    } catch (error) {
      log.error(`❌ خطأ في مراسلة ${target.username}:`, error.message);
    }
  }

  async updateStatistics() {
    const stats = this.currentCampaign.stats;
    
    const summary = [
      stats.found,          // T: Total_Targets
      stats.contacted,      // U: Contacted
      0,                    // V: Responses (يتم تحديثه لاحقاً)
      0,                    // W: Clicks (يتم تحديثه لاحقاً)
      0,                    // X: Purchases (يتم تحديثه لاحقاً)
      stats.contacted > 0 ? ((stats.contacted / stats.found) * 100).toFixed(2) : '0.00', // Y: Success_Rate
      new Date().toISOString() // Z: Last_Update
    ];
    
    await this.sheets.updateStatistics(summary);
  }

  async generateReport() {
    const duration = this.currentCampaign.endTime - this.currentCampaign.startTime;
    const minutes = (duration / 1000 / 60).toFixed(1);
    
    return {
      campaignId: this.currentCampaign.id,
      duration: `${minutes} دقيقة`,
      startTime: this.currentCampaign.startTime,
      endTime: this.currentCampaign.endTime,
      ...this.currentCampaign.stats,
      clickThroughRate: this.currentCampaign.stats.contacted > 0 ? 
        ((this.currentCampaign.stats.clicked / this.currentCampaign.stats.contacted) * 100).toFixed(2) : '0.00'
    };
  }

  async getStatistics() {
    return await this.sheets.getCurrentStats();
  }

  async cleanup() {
    if (this.messageSender) {
      await this.messageSender.cleanup();
    }
    log.info('🧹 تم تنظيف الموارد');
  }
}

module.exports = KonyProcessor;
