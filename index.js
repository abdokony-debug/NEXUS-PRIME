const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { FingerprintGenerator } = require('fingerprint-generator');
const axios = require('axios');
const fs = require('fs').promises;

chromium.use(StealthPlugin());

async function WahabPrimeEngineV2() {
    // ✅ Evidences & Logging
    await fs.mkdir('evidences', { recursive: true });
    const logger = await fs.open('mission_log.txt', 'a');

    // ✅ Chrome الحقيقي مع anti-detection
    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run', '--no-zygote',
            '--disable-gpu', '--disable-extensions'
        ]
    });

    try {
        // ✅ Google Sheets CSV parsing محسن
        const sheetRaw = await axios.get(process.env.SHEET_URL.replace(/\/edit.*$/, '/export?format=csv'), {
            timeout: 30000
        });
        
        const lines = sheetRaw.data.split('\n').filter(line => line.trim());
        const tasks = lines.slice(1).map(line => {
            const [id, url] = line.split(',').map(s => s.trim().replace(/"/g, ''));
            return { id, url: url.startsWith('http') ? url : `https://${url}` };
        }).filter(task => task.url);

        logger.write(`[START] ${new Date().toISOString()} | Tasks: ${tasks.length}\n`);

        // ✅ Task Processing مع Rate Limiting
        for (let i = 0; i < tasks.length; i++) {
            const { id, url } = tasks[i];
            logger.write(`[${i+1}/${tasks.length}] Processing: ${id} -> ${url}\n`);

            // ✅ Fingerprint حقيقي
            const fp = new FingerprintGenerator().getFingerprint({
                devices: ['desktop'], 
                operatingSystems: ['windows']
            });

            const context = await browser.newContext({
                userAgent: fp.useragent,
                viewport: { width: 1920, height: 1080 },
                locale: 'en-US',
                timezoneId: 'Africa/Cairo'
            });

            const page = await context.newPage();

            // ✅ Ultimate Stealth Script
            await page.addInitScript(() => {
                // Remove webdriver property
                delete navigator.__proto__.webdriver;
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                
                // Mock plugins & languages
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            });

            try {
                // ✅ Human-like navigation
                await page.goto(url, { 
                    waitUntil: 'networkidle', 
                    timeout: 45000 
                });

                // ✅ Advanced WAF Detection
                const checks = await page.evaluate(() => {
                    const blocks = ['Cloudflare', 'DDoS', 'Access denied', 'hcaptcha', 'recaptcha'];
                    const selectors = ['iframe[src*="captcha"]', '.cf-browser-check'];
                    return {
                        blocked: blocks.some(b => document.body.innerText.includes(b)),
                        captcha: selectors.some(s => !!document.querySelector(s))
                    };
                });

                const status = checks.blocked || checks.captcha ? '🚫 BLOCKED' : '✅ SUCCESS';
                logger.write(`[RESULT] ${id}: ${status}\n`);

                // ✅ Evidence collection
                await page.screenshot({ 
                    path: `evidences/${id}_${Date.now()}.png`, 
                    fullPage: true 
                });

            } catch (error) {
                logger.write(`[ERROR] ${id}: ${error.message}\n`);
            }

            await context.close();
            
            // ✅ Human delay بين الـ tasks
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
        }

    } catch (error) {
        logger.write(`[FATAL] ${error.message}\n`);
    }

    await browser.close();
    logger.close();
}

WahabPrimeEngineV2().catch(console.error);
