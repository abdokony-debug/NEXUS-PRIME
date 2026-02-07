require('dotenv').config();
const KonyProcessor = require('./kony-processor');

async function main() {
  try {
    const processor = new KonyProcessor({
      mode: process.env.KONY_MODE || 'standard',
      batchSize: parseInt(process.env.KONY_BATCH_SIZE) || 10,
      region: process.env.KONY_REGION || 'global',
      platforms: process.env.KONY_PLATFORMS || 'all'
    });

    await processor.initialize();
    const results = await processor.runCampaign();
    
    console.log('Campaign completed successfully');
    console.log('Results:', JSON.stringify(results, null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('Received SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  process.exit(0);
});

if (require.main === module) {
  main();
}
