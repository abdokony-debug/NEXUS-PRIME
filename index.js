const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    if (!fs.existsSync('evidences')) fs.mkdirSync('evidences');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com'); // اختبار أولي
    await page.screenshot({ path: 'evidences/test.png' });
    console.log("SUCCESS: Image Captured");
    await browser.close();
})();
