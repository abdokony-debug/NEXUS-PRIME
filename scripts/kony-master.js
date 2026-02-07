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
  const region = process.env.KONY_REGION || 'global';
  const platforms = process.env.KONY_PLATFORMS || 'all';
  
  console.log('📊 إعدادات الحملة:');
  console.log(`- الوضع: ${mode}`);
  console.log(`- حجم الدفعة: ${batchSize}`);
  console.log(`- المنطقة: ${region}`);
  console.log(`- المنصات: ${platforms}`);
  console.log('='.repeat(50));
  
  // تحديد ملف التشغيل
  let mainFile = findMainFile();
  
  console.log(`📜 تشغيل: ${mainFile}`);
  
  // تشغيل النظام
  await runKonyProcessor(mainFile, mode, batchSize, region);
}

// تحديد ملف التشغيل
function findMainFile() {
  const files = ['kony-processor.js', 'src/index.js'];
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      return file;
    }
  }
  
  console.error('❌ لم يتم العثور على ملف التشغيل الرئيسي');
  process.exit(1);
}

// تشغيل Kony processor
function runKonyProcessor(mainFile, mode, batchSize, region) {
  const command = `node ${mainFile} --mode=${mode} --batch-size=${batchSize} --region=${region}`;
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ خطأ: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.warn(`⚠️  تحذير: ${stderr}`);
      }
      
      console.log(stdout);
      console.log('✅ اكتمل التشغيل بنجاح');
      resolve();
    });
  });
}

// معالجة إشارات الإيقاف
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

function handleShutdown() {
  console.log('\n🛑 تلقي إشارة إيقاف...');
  process.exit(0);
}

// بدء التشغيل الرئيسي
main().catch(console.error);
