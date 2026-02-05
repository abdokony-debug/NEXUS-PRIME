const { chromium } = require('playwright');

console.log('🎯 نظام WAHAB - زيارة المواقع الآلية\n');

// المواقع من صورتك مباشرة
const sites = [
    { name: 'prizes gamee', url: 'https://prizes.gamee.com/get/dwf5azgy' },
    { name: 'freecash', url: 'https://freecash.com/r/C33IV' },
    { name: 'pawns.app', url: 'https://pawns.app/?r=18733307' },
    { name: 'extrabux', url: 'https://www.extrabux.com/r/6982c92095' },
    { name: 'swagbucks', url: 'https://www.swagbucks.com/p/register?rb=5' }
];

async function visitSites() {
    console.log(`📊 عدد المواقع: ${sites.length}\n`);
    
    // تشغيل المتصفح
    const browser = await chromium.launch({ 
        headless: false, // ⚡ غير لـ true إذا أردت تشغيله في الخلفية
        slowMo: 50 // إبطاء بسيط لترى ما يحدث
    });
    
    const page = await browser.newPage();
    
    // زيارة كل موقع
    for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        console.log(`📍 ${i+1}/${sites.length}: ${site.name}`);
        console.log(`🔗 ${site.url}`);
        
        try {
            // الانتقال للموقع
            await page.goto(site.url, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            
            // انتظار 2-3 ثواني
            await page.waitForTimeout(2000 + Math.random() * 1000);
            
            // التقاط صورة
            await page.screenshot({ 
                path: `${site.name.replace(/\s+/g, '_')}.png`,
                fullPage: false 
            });
            
            console.log('✅ تمت الزيارة والتقاط صورة\n');
            
        } catch (error) {
            console.log(`❌ خطأ: ${error.message}\n`);
        }
        
        // انتظار 1-3 ثواني بين المواقع
        if (i < sites.length - 1) {
            const waitTime = 1000 + Math.random() * 2000;
            console.log(`⏳ انتظار ${Math.round(waitTime/1000)} ثواني...\n`);
            await page.waitForTimeout(waitTime);
        }
    }
    
    // إنهاء
    await browser.close();
    console.log('🎉 اكتملت جميع الزيارات!');
    console.log('📸 تم حفظ الصور في المجلد الحالي');
}

// بدء التشغيل
visitSites().catch(error => {
    console.error('💥 خطأ غير متوقع:', error);
});
