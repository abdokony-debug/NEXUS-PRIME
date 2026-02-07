const { chromium } = require('playwright');

class PlatformProcessor {
    constructor() {
        this.results = [];
    }

    // معالجة منصة واحدة
    async processPlatform(platform, page) {
        const startTime = Date.now();
        const result = {
            platform: platform.name,
            url: platform.url,
            target_count: platform.count || 5,
            success: false,
            message: '',
            execution_time: 0
        };

        try {
            console.log(`🎯 معالجة: ${platform.name}`);
            await page.goto(platform.url, {
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            await page.waitForTimeout(2000);
            await this.simulateUserBehavior(page);
            result.success = await this.checkSuccess(page);

            result.message = result.success ? '✅ نجحت العملية' : '⚠️ تحتاج فحص يدوي';
            result.execution_time = Date.now() - startTime;

            console.log(`   ${result.message}`);

        } catch (error) {
            result.message = `❌ خطأ: ${error.message}`;
            console.log(`   ${result.message}`);
        }

        this.results.push(result);
        return result;
    }

    // محاكاة السلوك البشري
    async simulateUserBehavior(page) {
        const moves = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < moves; i++) {
            await page.mouse.move(
                Math.random() * 800,
                Math.random() * 600,
                { steps: 5 }
            );
            await page.waitForTimeout(Math.random() * 500 + 200);
        }
        await page.mouse.wheel(0, Math.random() * 300 + 100);
        await page.waitForTimeout(1000);
        await page.mouse.wheel(0, -100);
    }

    // التحقق من النجاح
    async checkSuccess(page) {
        const url = page.url();
        const title = await page.title();

        return !(url.includes('error') || url.includes('404') || title.toLowerCase().includes('not found'));
    }

    // معالجة جميع المنصات
    async processAllPlatforms(platforms) {
        console.log(`🚀 بدء معالجة ${platforms.length} منصة\n`);

        const browser = await chromium.launch({
            headless: false, 
            slowMo: 50 
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        for (let i = 0; i < platforms.length; i++) {
            const result = await this.processPlatform(platforms[i], page);

            if (i < platforms.length - 1) {
                const delay = Math.floor(Math.random() * 8000) + 3000;
                console.log(`   ⏳ انتظار ${Math.round(delay/1000)} ثواني...\n`);
                await page.waitForTimeout(delay);
            }
        }

        await browser.close();
        this.showResults();
        return this.results;
    }

    // عرض النتائج
    showResults() {
        console.log('\n📊 ===== النتائج النهائية =====');
        
        const total = this.results.length;
        const successful = this.results.filter(r => r.success).length;

        console.log(`   إجمالي المنصات: ${total}`);
        console.log(`   الناجحة: ${successful}`);
        console.log(`   الفاشلة: ${total - successful}`);
        console.log(`   نسبة النجاح: ${((successful / total) * 100).toFixed(1)}%`);

        console.log('\n📋 التفاصيل:');
        this.results.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.platform}: ${result.message} (${result.execution_time}ms)`);
        });
    }
}

module.exports = PlatformProcessor;
