const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

async function WahabFinalEngine() {
    console.log("--- OPERATION: REAL WORLD BREACH START ---");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        // 1. الوصول للشيت بصفة "بشرية"
        console.log("Step 1: Infiltrating Google Infrastructure...");
        await page.goto(process.env.SHEET_URL, { waitUntil: 'networkidle', timeout: 60000 });
        
        // استخراج البيانات من داخل الصفحة مباشرة (تجاوز حظر الـ API)
        const rawData = await page.evaluate(() => document.body.innerText);
        
        if (!rawData || rawData.length < 10) {
            throw new Error("DATA_EXTRACTION_FAILED_EMPTY_SHEET");
        }

        const lines = rawData.split('\n').filter(line => line.includes(','));
        console.log(`Step 2: Analysis Complete. Found ${lines.length} Targets.`);

        // 2. التنفيذ الميداني
        for (let line of lines) {
            const [id, url] = line.split(',');
            if (!url) continue;

            console.log(`Action: Processing Student ${id} -> ${url.trim()}`);
            await page.goto(url.trim(), { waitUntil: 'networkidle' });
            await page.screenshot({ path: `evidences/${id}.png` });
        }

        console.log("--- MISSION ACCOMPLISHED: ALL TARGETS PROCESSED ---");
    } catch (err) {
        console.error(`--- CRITICAL BREAKDOWN: ${err.message} ---`);
        process.exit(1); 
    } finally {
        await browser.close();
    }
}

WahabFinalEngine();
