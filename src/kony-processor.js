const GoogleSheets = require('./google-sheets');
const Searcher = require('./searcher');
const Messenger = require('./messenger');
const Tracker = require('./tracker');

class KonyProcessor {
  constructor(config = {}) {
    this.config = {
      mode: config.mode || 'standard',
      batchSize: config.batchSize || 10,
      region: config.region || 'global',
      platforms: config.platforms || 'all',
      ...config
    };
    
    this.sheets = null;
    this.searcher = null;
    this.messenger = null;
    this.tracker = null;
    this.results = {
      totalTargets: 0,
      contacted: 0,
      responses: 0,
      clicks: 0,
      purchases: 0,
      revenue: 0
    };
  }

  async initialize() {
    console.log('Initializing Kony Marketing System...');
    
    this.sheets = new GoogleSheets();
    await this.sheets.connect();
    
    this.searcher = new Searcher(this.config);
    this.messenger = new Messenger(this.config);
    this.tracker = new Tracker();
    
    console.log('System initialized');
  }

  async runCampaign() {
    console.log('Starting campaign...');
    
    // 1. Read products from sheet
    const products = await this.sheets.getProducts();
    
    if (products.length === 0) {
      console.log('No products found');
      return this.results;
    }
    
    console.log(`Found ${products.length} products`);
    
    // 2. Process each product
    for (const product of products) {
      await this.processProduct(product);
    }
    
    // 3. Update statistics
    await this.updateStatistics();
    
    return this.results;
  }

  async processProduct(product) {
    console.log(`Processing product: ${product.name}`);
    
    // Find targets for this product
    const targets = await this.searcher.findTargets(product);
    
    if (targets.length === 0) {
      console.log(`No targets found for ${product.name}`);
      return;
    }
    
    console.log(`Found ${targets.length} targets`);
    
    // Contact targets
    for (const target of targets) {
      if (this.results.contacted >= this.config.batchSize) {
        break;
      }
      
      await this.contactTarget(target, product);
      await this.delay(2000); // Rate limiting
    }
  }

  async contactTarget(target, product) {
    try {
      // Generate tracking link
      const trackingLink = this.tracker.generateLink(
        product.url,
        target.id,
        product.id
      );
      
      // Generate message
      const message = this.messenger.createMessage(target, product, trackingLink);
      
      // Send message
      const sent = await this.messenger.send(target, message);
      
      if (sent) {
        this.results.contacted++;
        
        // Record in sheet
        await this.sheets.recordTarget({
          targetId: target.id,
          productId: product.id,
          platform: target.platform,
          username: target.username,
          profileUrl: target.profileUrl,
          intentScore: target.intentScore,
          contactMethod: target.contactMethod,
          messageContent: message,
          trackingLink: trackingLink.shortUrl,
          status: 'CONTACTED',
          timestamp: new Date().toISOString()
        });
        
        console.log(`Message sent to ${target.username} on ${target.platform}`);
      }
      
    } catch (error) {
      console.error(`Failed to contact ${target.username}:`, error.message);
    }
  }

  async updateStatistics() {
    // Update sheet with campaign results
    await this.sheets.updateStats({
      totalTargets: this.results.totalTargets,
      contacted: this.results.contacted,
      responses: this.results.responses,
      clicks: this.results.clicks,
      purchases: this.results.purchases,
      revenue: this.results.revenue,
      lastUpdate: new Date().toISOString()
    });
    
    console.log('Statistics updated');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.messenger) {
      await this.messenger.cleanup();
    }
    console.log('Cleanup completed');
  }
}

module.exports = KonyProcessor;
