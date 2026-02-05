require('dotenv').config();
const fs = require('fs');
const { chromium } = require('playwright');
const chalk = require('chalk');

console.log(chalk.green.bold('🚀 نظام WAHAB يعمل الآن!'));
console.log(chalk.cyan('==============================\n'));

async function main() {
    // التحقق من الإعدادات
    if (!process.env.GOOGLE_SHEET_URL) {
        console.log(chalk.red('❌ لم يتم تعيين رابط Google Sheet'));
        console.log(chalk.yellow('🔧 أضف إلى ملف .env:'));
        console.log(chalk.white('GOOGLE_SHEET_URL=رابط_الشيت_هنا'));
        return;
    }

    console.log(chalk.blue('📄 رابط الشيت:'), process.env.GOOGLE_SHEET_URL);

    // 1. تشغيل المتصفح
    console.log(chalk.yellow('\n🌐 تشغيل المتصفح...'));
    const browser = await chromium.launch({ 
        headless: false, // يمكن تغييره لـ true
        slowMo: 100 // إبطاء للرؤية
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // 2. قراءة المنصات (يمكن تغييرها لقراءة من Google Sheets)
    const platforms = [
        {
            name: 'prizes gamee',
            url: 'https://prizes.gamee.com/get/dwf5azgy',
            count: 5
        },
        {
            name: 'freecash',
            url: 'https://freecash.com/r/C33IV',
            count: 5
        },
        {
            name: 'pawns.app',
            url: 'https://pawns.app/?r=18733307',
            count: 5
        }
    ];
    
    console.log(chalk.green(`✅ تم تحميل ${platforms.length} منصة`));
    
    // 3. معالجة كل منصة
    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        
        console.log(chalk.cyan(`\n🎯 المنصة ${i + 1}/${platforms.length}: ${platform.name}`));
        console.log(chalk.white(`🔗 الرابط: ${platform.url}`));
        
        try {
            // زيارة الموقع
            await page.goto(platform.url, { waitUntil: 'domcontentloaded' });
            
            // انتظار تحميل الصفحة
            await page.waitForTimeout(2000);
            
            // التقاط لقطة شاشة
            await page.screenshot({ 
                path: `screenshots/${platform.name.replace(/\s+/g, '_')}_${Date.now()}.png`,
                fullPage: true 
            });
            
            // محاكاة التفاعل البشري
            await humanLikeInteraction(page);
            
            console.log(chalk.green(`✅ تمت زيارة ${platform.name} بنجاح`));
            
            // تأخير بين المواقع
            if (i < platforms.length - 1) {
                const delay = Math.floor(Math.random() * 5000) + 3000;
                console.log(chalk.gray(`⏳ انتظار ${delay/1000} ثواني...`));
                await page.waitForTimeout(delay);
            }
            
        } catch (error) {
            console.log(chalk.red(`❌ خطأ في ${platform.name}: ${error.message}`));
        }
    }
    
    // 4. إنهاء الجلسة
    console.log(chalk.green('\n✅ اكتملت جميع المهام!'));
    await browser.close();
}

// محاكاة سلوك بشري
async function humanLikeInteraction(page) {
    // حركة عشوائية للماوس
    await page.mouse.move(
        Math.random() * 800,
        Math.random() * 600,
        { steps: 10 }
    );
    
    // تمرير عشوائي
    await page.mouse.wheel(0, Math.random() * 200 + 100);
    
    // تأخيرات عشوائية
    await page.waitForTimeout(Math.random() * 1000 + 500);
}

// تشغيل النظام
main().catch(error => {
    console.error(chalk.red('💥 خطأ غير متوقع:'), error);
    process.exit(1);
});
