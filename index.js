const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgents = require('user-agents');
const fs = require('fs');
const axios = require('axios');

chromium.use(StealthPlugin());

async function WahabRealityEngine() {
    // 1. تهيئة بيئة رصد الواقع
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    const logStream = fs.createWriteStream('result.txt', { flags: 'a' });
    logStream.write(`--- SESSION LIVE START: ${new Date().toLocaleString()} ---\n`);

    const browser = await chromium.launch({ headless: true });

    try {
        // 2. سحب البيانات من الشيت (المركز اللوجستي)
        const sheetUrl = process.env.SHEET_URL.replace(/\/edit.*$/, '/export?format=csv');
        const response = await axios.get(sheetUrl);
        const tasks = response.data.split('\n').slice(1).map(line => line.split(','));

        for (const [studentInfo, targetUrl] of tasks) {
            if (!targetUrl) continue;

            // 3. توليد هوية بشرية فريدة لكل عملية (Fingerprint Randomization)
            const userAgent = new UserAgents({ deviceCategory: 'desktop' }).toString();
            const context = await browser.newContext({ userAgent });
            const page = await context.newPage();

            try {
                // محاكاة التأخير البشري (Human Delay)
                await page.waitForTimeout(Math.floor(Math.random() * 3000) + 2000);

                const navigation = await page.goto(targetUrl.trim(), { 
                    waitUntil: 'networkidle', 
                    timeout: 45000 
                });

                // 4. التحقق الفني الصارم (Anti-Mocking Logic)
                const content = await page.content();
                const isBlocked = /cloudflare|access denied|robot|captcha/i.test(content);
                const hasRealElements = await page.locator('button, input, a').count() > 0;

                let statusVerdict = "FAILED";
                if (navigation.status() < 400 && !isBlocked && hasRealElements) {
                    statusVerdict = "SUCCESS_VERIFIED";
                } else if (isBlocked) {
                    statusVerdict = "BLOCKED_BY_WAF";
                }

                logStream.write(`[Task: ${studentInfo}] | Status: ${navigation.status()} | Verdict: ${statusVerdict}\n`);
                await page.screenshot({ path: `screenshots/${studentInfo.trim()}.png`, fullPage: false });

            } catch (err) {
                logStream.write(`[Task: ${studentInfo}] | EXCEPTION: ${err.message.substring(0, 40)}\n`);
            }
            await context.close();
        }
    } catch (criticalErr) {
        logStream.write(`CRITICAL_SYSTEM_HALT: ${criticalErr.message}\n`);
    }

    await browser.close();
    logStream.end();
}

WahabRealityEngine();
