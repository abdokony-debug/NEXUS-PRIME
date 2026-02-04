const { chromium } = require('playwright');
const fs = require('fs');

async function StartWahab() {
    console.log("[SYSTEM] BOOTING ENGINE...");
    // استخدام وسائط (Flags) خاصة للعمل داخل بيئات السيرفرات (No Sandbox)
    const browser = await chromium.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    try {
        if (!fs.existsSync('database.csv')) {
            throw new Error("DATABASE_FILE_MISSING");
        }

        const data = fs.readFileSync('database.csv', 'utf8');
        const lines = data.split('\n').filter(l => l.includes(',')).slice(1);

        console.log(`[LOG] Found ${lines.length} Targets in internal storage.`);

        for (let line of lines) {
            const [id, url] = line.split(',');
            if (!url) continue;

            console.log(`[MISSION] Accessing: ${url.trim()}`);
            await page.goto(url.trim(), { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log(`[SUCCESS] Data verified for ID: ${id}`);
        }
    } catch (err) {
        console.error(`[FATAL_FAILURE] Details: ${err.message}`);
        process.exit(1);
    } finally {
        await browser.close();
        console.log("[SYSTEM] SHUTDOWN.");
    }
}

StartWahab();
