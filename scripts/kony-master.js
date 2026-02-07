#!/usr/bin/env node
// scripts/kony-master.js

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🚀 نظام Kony للتسويق - سكربت التشغيل الرئيسي');
  console.log('='.repeat(50));
  
  // قراءة الإعدادات من environment
  const mode = process.env.KONY_CAMPAIGN_MODE || 'standard';
  const batchSize = process.env.KONY_BATCH_SIZE || 10;
  const region = process.env.KONY_TARGET_REGION || 'global';
  const platforms = process.env.KONY_PLATFORMS || 'all';
  
  console.log('📊 إعدادات الحملة:');
  console.log(`- الوضع: ${mode}`);
  console.log(`- حجم الدفعة: ${batchSize}`);
  console.log(`- المنطقة: ${region}`);
  console.log(`- المنصات: ${platforms}`);
  console.log('='.repeat(50));
  
  // تحديد ملف التشغيل
  let mainFile;
  
  if (fs.existsSync('kony-processor.js')) {
    mainFile = 'kony-processor.js';
  } else if (fs.existsSync('src/index.js')) {
    mainFile = 'src/index.js';
  } else {
    console.error('❌ لم يتم العثور على ملف التشغيل الرئيسي');
    process.exit(1);
  }
  
  console.log(`📜 تشغيل: ${mainFile}`);
  
  // تشغيل النظام
  const command = `node ${mainFile} --mode=${mode} --batch-size=${batchSize} --region=${region}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ خطأ: ${error.message}`);
      process.exit(1);
    }
    
    if (stderr) {
      console.error(`⚠️  تحذير: ${stderr}`);
    }
    
    console.log(stdout);
    console.log('✅ اكتمل التشغيل بنجاح');
  });
}

// معالجة إشارات الإيقاف
process.on('SIGINT', () => {
  console.log('\n🛑 تلقي إشارة إيقاف...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 تلقي إشارة إنهاء...');
  process.exit(0);
});

main().catch(console.error);
