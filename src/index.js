require('dotenv').config();

class KonySystem {
  constructor() {
    this.mode = process.env.KONY_MODE || 'standard';
    this.batchSize = parseInt(process.env.KONY_BATCH_SIZE) || 10;
    this.region = process.env.KONY_REGION || 'global';
    this.sheetId = process.env.GOOGLE_SHEETS_ID;
  }

  async initialize() {
    console.log('Initializing Kony System...');
    console.log(`Mode: ${this.mode}`);
    console.log(`Batch Size: ${this.batchSize}`);
    console.log(`Region: ${this.region}`);
    
    if (this.sheetId) {
      console.log('Google Sheets ID found');
    } else {
      console.log('Google Sheets ID not found - running in demo mode');
    }
  }

  async runCampaign() {
    console.log('\nStarting campaign...');
    
    // Simulate search
    const targets = this.simulateSearch();
    console.log(`Found ${targets.length} potential buyers`);
    
    // Simulate messaging
    const results = this.simulateMessaging(targets);
    
    // Generate report
    this.generateReport(results);
    
    return results;
  }

  simulateSearch() {
    const platforms = ['Reddit', 'Twitter', 'LinkedIn', 'Instagram'];
    const targets = [];
    
    for (let i = 0; i < this.batchSize; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      targets.push({
        id: `T-${Date.now()}-${i}`,
        platform: platform,
        username: `user${i + 1}`,
        intentScore: Math.floor(Math.random() * 30) + 70,
        region: this.region
      });
    }
    
    return targets.filter(t => t.intentScore > 75);
  }

  simulateMessaging(targets) {
    console.log('Sending messages...');
    
    const results = {
      total: targets.length,
      sent: 0,
      failed: 0,
      responses: 0
    };
    
    targets.forEach((target, index) => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        
        if (success) {
          results.sent++;
          if (Math.random() > 0.5) {
            results.responses++;
          }
          console.log(`✓ Message sent to ${target.username} on ${target.platform}`);
        } else {
          results.failed++;
          console.log(`✗ Failed to send to ${target.username}`);
        }
      }, index * 100);
    });
    
    return results;
  }

  generateReport(results) {
    console.log('\n=== Campaign Report ===');
    console.log(`Total Targets: ${results.total}`);
    console.log(`Messages Sent: ${results.sent}`);
    console.log(`Messages Failed: ${results.failed}`);
    console.log(`Responses Received: ${results.responses}`);
    console.log(`Success Rate: ${((results.sent / results.total) * 100).toFixed(1)}%`);
    console.log('======================\n');
  }
}

async function main() {
  try {
    const system = new KonySystem();
    await system.initialize();
    
    const results = await system.runCampaign();
    
    console.log('Campaign completed successfully');
    
    // For GitHub Actions - create output file
    const fs = require('fs');
    fs.writeFileSync('campaign_results.json', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { KonySystem };
