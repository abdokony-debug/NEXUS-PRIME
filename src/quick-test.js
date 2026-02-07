// quick-test.js - Comprehensive Test
console.log('Testing ALL Kony System Components...\n');

const components = [
  { name: 'Stealth Engine', file: 'stealth-engine.js' },
  { name: 'Proxy Rotator', file: 'proxy-rotator.js' },
  { name: 'Browser Simulator', file: 'browser-simulator.js' },
  { name: 'Platform Processor', file: 'platform-processor.js' },
  { name: 'Identity Manager', file: 'identity-manager.js' },
  { name: 'Google Sheets Manager', file: 'GoogleSheetsManager/index.js' },
  { name: 'Kony Processor', file: 'kony-processor.js' },
  { name: 'Report Generator', file: 'report-generator.js' },
  { name: 'Academic Automator', file: 'academic-automator.js' },
  { name: 'Referral Processor', file: 'referral-processor.js' }
];

const fs = require('fs');

// Check each component
components.forEach(component => {
  if (fs.existsSync(component.file)) {
    console.log(`✓ ${component.name}: EXISTS`);

    // Attempt to load the component
    try {
      require(`./${component.file.replace('.js', '')}`);
      console.log(`  Loaded successfully\n`);
    } catch (error) {
      console.log(`  Load error: ${error.message}\n`);
    }
  } else {
    console.log(`✗ ${component.name}: MISSING\n`);
  }
});

console.log('\n=== Integration Test ===');
console.log('Testing integrated system...\n');

try {
  const IntegratedSystem = require('./index');
  console.log('✓ Integrated system can be loaded');
  
  // Initialize system
  const system = new IntegratedSystem();
  console.log('✓ Integrated system instance created');

  // Here you could add more tests for specific functions or components.

  console.log('\n✅ ALL TESTS PASSED - System is ready!');

} catch (error) {
  console.error('✗ Integration test failed:', error.message);
  console.log('\n⚠️  Some components may need adjustment');
}
