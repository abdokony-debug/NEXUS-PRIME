require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');
const cheerio = require('cheerio');

class KonySystem {
  constructor() {
    this.sheets = null;
    this.campaignId = `CAMP-${Date.now()}`;
    this.results = {
      totalTargets: 0,
      contacted: 0,
      responses: 0,
      clicks: 0,
      purchases: 0
    };
  }

  async initialize() {
    console.log('Initializing Kony Marketing System...');
    
    if (process.env.GOOGLE_SHEETS_ID) {
      await this.connectGoogleSheets();
    }
    
    console.log('System initialized successfully');
  }

  async connectGoogleSheets() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('Connected to Google Sheets');
      
    } catch (error) {
      console.error('Failed to connect to Google Sheets:', error.message);
    }
  }

  async getProductsFromSheet() {
    if (!this.sheets) {
      return this.getSampleProducts();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: 'A2:D100'
      });

      const rows = response.data.values || [];
      return rows.map(row => ({
        name: row[0] || '',
        keywords: (row[1] || '').split(',').map(k => k.trim()),
        url: row[2] || '',
        region: row[3] || 'global'
      })).filter(p => p.name && p.url);
      
    } catch (error) {
      console.error('Error reading products:', error.message);
      return this.getSampleProducts();
    }
  }

  getSampleProducts() {
    return [
      {
        name: 'Python Programming T-Shirt',
        keywords: ['python', 'coding', 'programming'],
        url: 'https://example.com/python-shirt',
        region: 'global'
      },
      {
        name: 'JavaScript Developer Hoodie',
        keywords: ['javascript', 'web development', 'coding'],
        url: 'https://example.com/js-hoodie',
        region: 'global'
      }
    ];
  }

  async searchReddit(keywords, region) {
    try {
      const query = keywords.join(' OR ');
      const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'KonyMarketingBot/1.0'
        }
      });

      return response.data.data.children
        .filter(post => post.data.author !== '[deleted]')
        .map(post => ({
          id: `R-${post.data.id}`,
          platform: 'Reddit',
          username: post.data.author,
          profileUrl: `https://reddit.com/user/${post.data.author}`,
          content: post.data.title,
          intentScore: this.calculateIntentScore(post.data.title),
          contactMethod: 'DM',
          contactInfo: post.data.author
        }))
        .filter(target => target.intentScore >= 70);
        
    } catch (error) {
      console.error('Reddit search error:', error.message);
      return [];
    }
  }

  calculateIntentScore(content) {
    const text = content.toLowerCase();
    let score = 50;

    const signals = [
      { words: ['buy', 'purchase', 'order'], weight: 20 },
      { words: ['where to get', 'looking for', 'need'], weight: 15 },
      { words: ['price', 'cost', 'discount'], weight: 10 },
      { words: ['recommend', 'suggest', 'advice'], weight: 5 }
    ];

    signals.forEach(signal => {
      if (signal.words.some(word => text.includes(word))) {
        score += signal.weight;
      }
    });

    return Math.min(score, 100);
  }

  async contactTarget(target, product) {
    try {
      const trackingId = `${this.campaignId}-${target.id}`;
      const message = this.generateMessage(target, product, trackingId);
      
      console.log(`Contacting ${target.username} on ${target.platform}`);
      
      await this.delay(1500);
      
      this.results.contacted++;
      
      if (this.sheets) {
        await this.recordContact(target, product, trackingId);
      }
      
      return { success: true, trackingId };
      
    } catch (error) {
      console.error(`Failed to contact ${target.username}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  generateMessage(target, product, trackingId) {
    const templates = {
      Reddit: `Hey ${target.username}! I noticed you were interested in ${product.keywords[0]}. You might like this ${product.name}: ${product.url}?ref=${trackingId}`,
      Twitter: `Hi ${target.username}! Check out this ${product.name} - might be what you're looking for: ${product.url}?ref=${trackingId}`,
      LinkedIn: `Hello, I think this ${product.name} could be relevant for you: ${product.url}?ref=${trackingId}`,
      default: `Hi, thought you might be interested in this ${product.name}: ${product.url}?ref=${trackingId}`
    };

    return templates[target.platform] || templates.default;
  }

  async recordContact(target, product, trackingId) {
    const row = [
      trackingId,
      product.name,
      target.platform,
      target.username,
      target.intentScore,
      new Date().toISOString(),
      'CONTACTED'
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] }
    });
  }

  async runCampaign() {
    console.log('\nStarting campaign...');
    console.log('===================\n');
    
    const products = await this.getProductsFromSheet();
    console.log(`Found ${products.length} products to process\n`);
    
    for (const product of products) {
      console.log(`Processing: ${product.name}`);
      
      const targets = await this.searchReddit(product.keywords, product.region);
      console.log(`  Found ${targets.length} potential buyers\n`);
      
      for (const target of targets) {
        if (this.results.contacted >= 10) {
          console.log('  Batch limit reached');
          break;
        }
        
        await this.contactTarget(target, product);
        await this.delay(2000);
      }
    }
    
    this.generateReport();
    return this.results;
  }

  generateReport() {
    console.log('\n========================================');
    console.log('Campaign Report');
    console.log('========================================');
    console.log(`Campaign ID: ${this.campaignId}`);
    console.log(`Total Targets Found: ${this.results.totalTargets}`);
    console.log(`Targets Contacted: ${this.results.contacted}`);
    console.log(`Contact Rate: ${this.results.totalTargets > 0 ? ((this.results.contacted / this.results.totalTargets) * 100).toFixed(1) : 0}%`);
    console.log(`Estimated Clicks: ${Math.floor(this.results.contacted * 0.3)}`);
    console.log(`Estimated Purchases: ${Math.floor(this.results.contacted * 0.1)}`);
    console.log('========================================\n');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    console.log('Cleaning up resources...');
  }
}

async function main() {
  const system = new KonySystem();
  
  try {
    await system.initialize();
    const results = await system.runCampaign();
    
    console.log('Campaign completed successfully!');
    
    const fs = require('fs');
    fs.writeFileSync(
      'campaign_results.json',
      JSON.stringify({
        campaignId: system.campaignId,
        timestamp: new Date().toISOString(),
        results: results,
        success: true
      }, null, 2)
    );
    
    await system.cleanup();
    process.exit(0);
    
  } catch (error) {
    console.error('Campaign failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = KonySystem;
