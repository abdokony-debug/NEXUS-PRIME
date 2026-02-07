require('dotenv').config();
const KonyMarketing = require('../src/index');
const { log } = require('../src/utils/helpers');

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 KONY MARKETING SYSTEM - الإطلاق النهائي');
  console.log('🎯 نظام البحث عن المشترين الحقيقيين والمراسلة الذكية');
  console.log('='.repeat(60));
  
  log.info('🔍 فحص الإعدادات...');
  
  // التحقق من الإعدادات المطلوبة
  const requiredEnvVars = [
    'GOOGLE_SHEETS_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ إعدادات مفقودة:', missingVars.join(', '));
    console.error('📝 يرجى تعبئة ملف .env بناءً على .env.example');
    process.exit(1);
  }
  
  log.info('✅ جميع الإعدادات صحيحة');
  
  try {
    // بدء النظام
    await KonyMarketing.start();
    
    // معالجة إشارات الإيقاف
    process.on('SIGINT', async () => {
      console.log('\n🛑 تلقي إشارة إيقاف...');
      await KonyMarketing.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 تلقي إشارة إنهاء...');
      await KonyMarketing.stop();
      process.exit(0);
    });
    
  } catch (error) {
    log.error('❌ خطأ فادح في النظام:', error);
    process.exit(1);
  }
}

// تشغيل النظام
main().catch(error => {
  console.error('💥 خطأ في الإطلاق:', error);
  process.exit(1);
});
