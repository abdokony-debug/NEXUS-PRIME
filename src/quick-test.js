require('dotenv').config();
const { chromium } = require('playwright');

async function quickTest() {
    console.log('🧪 اختبار سريع للنظام...');
    
    // 1. اختبار المتصفح
    console.log('🌐 اختبار تشغيل المتصفح...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // 2. زيارة موقع اختبار
    console.log('🔗 زيارة موقع اختبار...');
    await page.goto('https://httpbin.org/ip');
    
    // 3. الحصول على IP
    const content = await page.content();
    if (content.includes('origin')) {
        console.log('✅ المتصفح يعمل بنجاح!');
    }
    
    await browser.close();
    
    // 4. اختبار .env
    console.log('\n📄 اختبار ملف .env...');
    const requiredVars = ['GOOGLE_SHEET_URL'];
    
    let allGood = true;
    for (const varName of requiredVars) {
        if (process.env[varName]) {
            console.log(`✅ ${varName}: موجود`);
        } else {
            console.log(`❌ ${varName}: مفقود`);
            allGood = false;
        }
    }
    
    if (allGood) {
        console.log('\n🎉 كل شيء جاهز! يمكنك تشغيل: npm start');
    } else {
        console.log('\n🔧 يرجى تعديل ملف .env أولاً');
    }
}

quickTest().catch(console.error);
