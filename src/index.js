// WAHAB Registration System - الإصدار البسيط الفعال
const { google } = require('googleapis');
const { chromium } = require('playwright');

console.log("🚀 WAHAB Registration System");
console.log("📅 " + new Date().toISOString());

async function main() {
    try {
        // 1. التحقق من الأسرار
        console.log("\n🔍 Checking environment...");
        const requiredVars = ['GOOGLE_SHEET_URL', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
        for (const envVar of requiredVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing: ${envVar}`);
            }
        }
        console.log("✅ Environment OK");
        
        // 2. استخراج ID من الرابط
        const sheetUrl = process.env.GOOGLE_SHEET_URL;
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) throw new Error('Invalid Google Sheets URL');
        const spreadsheetId = match[1];
        console.log(`📊 Sheet ID: ${spreadsheetId}`);
        
        // 3. الاتصال بـ Google Sheets
        console.log("\n🔗 Connecting to Google Sheets...");
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
        
        // اختبار الاتصال
        const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
        console.log(`✅ Connected to: "${sheetInfo.data.properties.title}"`);
        
        // 4. قراءة المنصات من الجدول
        console.log("\n📖 Reading platforms from sheet...");
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:D',
        });
        
        const rows = response.data.values || [];
        console.log(`📊 Total rows: ${rows.length}`);
        
        if (rows.length === 0) {
            console.log("✅ No data to process");
            return;
        }
        
        // تحليل الصفوف
        const platforms = [];
        const startRow = rows[0][0]?.includes('Platform') ? 1 : 0;
        
        for (let i = startRow; i < Math.min(rows.length, startRow + 5); i++) {
            const row = rows[i];
            const platform = {
                name: row[0] || `Platform_${i}`,
                url: row[1] || '',
                count: parseInt(row[2]) || 0,
                status: row[3] || ''
            };
            
            if (platform.url && platform.url.startsWith('http') && platform.count > 0) {
                platforms.push(platform);
            }
        }
        
        console.log(`✅ Found ${platforms.length} platforms to process`);
        
        if (platforms.length === 0) {
            console.log("✅ No platforms to process");
            return;
        }
        
        // 5. معالجة كل منصة
        console.log("\n🔄 Processing platforms...");
        
        for (const platform of platforms) {
            console.log(`\n📍 Processing: ${platform.name}`);
            console.log(`   🔗 URL: ${platform.url}`);
            console.log(`   👥 Accounts: ${platform.count}`);
            
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            try {
                // زيارة الصفحة
                console.log(`   🌐 Visiting page...`);
                await page.goto(platform.url, { waitUntil: 'networkidle' });
                
                // تحليل المحتوى
                const title = await page.title();
                const url = page.url();
                console.log(`   📝 Title: ${title.substring(0, 50)}...`);
                console.log(`   🔗 Current URL: ${url}`);
                
                // البحث عن حقول التسجيل
                const emailField = await page.$('input[type="email"], input[name*="email"]');
                const passwordField = await page.$('input[type="password"], input[name*="password"]');
                
                if (emailField && passwordField) {
                    console.log(`   ✅ Registration form found!`);
                    
                    // هنا يمكن إضافة منطق التسجيل
                    // await emailField.fill('test@example.com');
                    // await passwordField.fill('Password123!');
                    // await page.click('button[type="submit"]');
                    
                    // تحديث الجدول
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `D${startRow + platforms.indexOf(platform) + 1}`,
                        valueInputOption: 'RAW',
                        resource: { values: [['READY_FOR_REGISTRATION']] }
                    });
                    
                    console.log(`   📤 Updated sheet: READY_FOR_REGISTRATION`);
                } else {
                    console.log(`   ⚠️ No registration form found`);
                    
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `D${startRow + platforms.indexOf(platform) + 1}`,
                        valueInputOption: 'RAW',
                        resource: { values: [['NO_FORM']] }
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `D${startRow + platforms.indexOf(platform) + 1}`,
                    valueInputOption: 'RAW',
                    resource: { values: [['ERROR']] }
                });
            } finally {
                await browser.close();
            }
            
            // تأخير بين المنصات
            if (platform !== platforms[platforms.length - 1]) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        console.log("\n🎉 System completed successfully!");
        console.log("📊 Check Google Sheets for results");
        
    } catch (error) {
        console.error("\n❌ SYSTEM FAILED!");
        console.error("Error:", error.message);
        process.exit(1);
    }
}

// تشغيل النظام
if (require.main === module) {
    main();
}
