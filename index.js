const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

chromium.use(StealthPlugin());

async function WahabFinalAuthority() {
    console.log("[LOG] MISSION START: REALITY BREACH V3");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        const targetUrl = process.env.SHEET_URL;
        if (!targetUrl) throw new Error("SHEET_URL_IS_BLANK");

        console.log("[LOG] STEP 1: OPENING DATA SOURCE...");
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

        // التحقق من طبيعة الصفحة (هل هي صفحة دخول أم بيانات؟)
        const bodyText = await page.innerText('body');
        
        if (bodyText.length < 50) {
            console.log("[DEBUG] PAGE CONTENT TOO SHORT. CAPTURING FOR ANALYSIS...");
            await page.screenshot({ path: 'DEBUG_EMPTY_PAGE.png' });
            throw new Error("PAGE_ACCESS_DENIED_OR_EMPTY");
        }

        // تحويل النص إلى بيانات (CSV Parsing)
        const rows = bodyText.split('\n').filter(r => r.includes(','));
        console.log(`[LOG] STEP 2: DATA ACQUIRED. FOUND ${rows.length} TARGETS.`);

        if (!fs.existsSync('evidences')) fs.mkdirSync('evidences');

        for (const row of rows) {
            const [id, url] = row.split(',');
            if (!url || !url.startsWith('http')) continue;

            console.log(`[EXEC] TARGET: ${id} -> ${url.trim()}`);
            await page.goto(url.trim(), { waitUntil: 'domcontentloaded' });
            await page.screenshot({ path: `evidences/${id.trim()}.png` });
        }

        console.log("[LOG] MISSION SUCCESS: DATA CAPTURED.");
    } catch (err) {
        console.error(`[FATAL] SYSTEM CRASHED: ${err.message}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

WahabFinalAuthority();
