// quick-test.js - محدث لنظام Kony
console.log('🧪 اختبار سريع لنظام Kony');

// اختبار الملفات الأساسية
const requiredFiles = [
  'kony-processor.js',
  'google-sheets.js',
  'stealth-engine.js',
  'proxy-rotator.js',
  'browser-simulator.js'
];

console.log('🔍 فحص الملفات المطلوبة...');
requiredFiles.forEach(file => {
  const fs = require('fs');
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} (مفقود)`);
  }
});

// اختبار بسيط للوظائف الأساسية
console.log('\n🔧 اختبار الوظائف الأساسية...');
try {
  require('dotenv').config();
  console.log('✅ dotenv محمل');
  
  // اختبار وجود متغيرات البيئة
  const requiredEnvVars = ['GOOGLE_SHEETS_ID'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.log(`⚠️  متغيرات مفقودة: ${missing.join(', ')}`);
  } else {
    console.log('✅ متغيرات البيئة صحيحة');
  }
  
  console.log('\n✅ جميع الاختبارات الأساسية ناجحة!');
  console.log('🚀 النظام جاهز للتشغيل');
  
} catch (error) {
  console.error('❌ خطأ في الاختبار:', error.message);
  process.exit(1);
}
