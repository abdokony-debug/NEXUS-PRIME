const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

chromium.use(StealthPlugin());

async function WahabDiagnosticEngine() {
    console.log("--- SYSTEM START: INITIALIZING REALITY CHECK ---");
    
    // 1. التحقق من وجود الوقود (The Secret)
    if (!process.env.SHEET_URL) {
        console.error("FATAL ERROR: SHEET_URL IS MISSING IN SECRETS!");
        process.exit(1);
    }

    try {
        console.log("ATTEMPTING TO FETCH DATA FROM CLOUD...");
        const response = await axios.get(process.env.SHEET_URL, { timeout: 15000 });
        
        // 2. فحص محتوى البيانات المستلمة
        if (response.data.includes('html') || response.data.includes('login')) {
            console.error("ACCESS DENIED: Google is asking for login. Make sure Sheet is 'Anyone with link'!");
            process.exit(1);
        }

        const tasks = response.data.split('\n').filter(l => l.includes(','));
        console.log(`SUCCESS: Found ${tasks.length} tasks. Unleashing Browser...`);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        // تنفيذ مهمة اختبارية واحدة للتأكد من اختراق المواقع
        if(tasks.length > 0) {
            const [id, url] = tasks[1].split(','); 
            await page.goto(url.trim(), { waitUntil: 'networkidle' });
            console.log(`REALITY CAPTURED: Page Title is ${await page.title()}`);
        }

        await browser.close();
        console.log("--- MISSION ACCOMPLISHED ---");

    } catch (error) {
        console.error(`TECHNICAL CRASH: ${error.message}`);
        process.exit(1);
    }
}

WahabDiagnosticEngine();
