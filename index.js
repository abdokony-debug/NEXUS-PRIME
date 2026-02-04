const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("--- WAHAB ENGINE STARTING ---");
    
    // تأمين مسار المجلدات
    if (!fs.existsSync('evidences')) {
        fs.mkdirSync('evidences');
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // اختبار العبور والقدرة
        console.log("Navigating to target...");
        await page.goto('https://www.google.com', { waitUntil: 'networkidle' });
        
        // التقاط الدليل البصري
        const path = `evidences/operation_proof_${Date.now()}.png`;
        await page.screenshot({ path: path });
        
        console.log(`SUCCESS: Evidence captured at ${path}`);
        
        // تسجيل تقرير نصي
        fs.writeFileSync('evidences/status.txt', `Operation successful at ${new Date().toISOString()}`);

    } catch (error) {
        console.error("MISSION FAILED:", error);
        fs.writeFileSync('evidences/error.txt', error.stack);
    } finally {
        await browser.close();
        console.log("--- WAHAB ENGINE SHUTDOWN ---");
    }
})();
