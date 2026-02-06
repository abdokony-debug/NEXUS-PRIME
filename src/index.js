// WAHAB SMART REGISTRATION SYSTEM - الإصدار المحسن
const { google } = require('googleapis');
const { chromium } = require('playwright');

console.log("🚀 WAHAB SMART REGISTRATION SYSTEM");
console.log("📅 " + new Date().toISOString());

// ==================== اكتشاف صفحة التسجيل ====================
async function findRegistrationPage(page, url) {
    console.log(`   🔍 البحث عن صفحة التسجيل...`);
    
    try {
        // الانتقال إلى الرابط
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        // التحقق مما إذا كانت هذه صفحة تسجيل
        const currentUrl = page.url();
        const pageTitle = await page.title().toLowerCase();
        const pageContent = (await page.content() || '').toLowerCase();
        
        // مؤشرات صفحة التسجيل
        const registrationIndicators = [
            'sign up', 'register', 'create account', 'join now',
            'signup', 'registration', 'مشترك جديد', 'تسجيل'
        ];
        
        const hasRegistrationText = registrationIndicators.some(indicator => 
            pageTitle.includes(indicator) || pageContent.includes(indicator)
        );
        
        // البحث عن حقول التسجيل
        const emailField = await page.$('input[type="email"], input[name*="email"]');
        const passwordField = await page.$('input[type="password"], input[name*="password"]');
        
        if (hasRegistrationText || (emailField && passwordField)) {
            console.log(`     ✅ هذه صفحة تسجيل!`);
            return { 
                isRegistrationPage: true, 
                url: currentUrl,
                hasForm: true,
                formFields: { email: !!emailField, password: !!passwordField }
            };
        }
        
        // البحث عن روابط التسجيل في الصفحة
        console.log(`     🔗 البحث عن روابط التسجيل في الصفحة...`);
        const registrationLinks = await page.$$eval('a', links => 
            links
                .filter(link => {
                    const text = (link.textContent || '').toLowerCase();
                    const href = (link.href || '').toLowerCase();
                    return text.includes('sign up') || text.includes('register') || 
                           text.includes('join') || href.includes('register') ||
                           href.includes('signup');
                })
                .map(link => link.href)
        );
        
        if (registrationLinks.length > 0) {
            console.log(`     🔗 وجد ${registrationLinks.length} روابط تسجيل`);
            return { 
                isRegistrationPage: false, 
                registrationLinks: registrationLinks.slice(0, 3) // أول 3 روابط فقط
            };
        }
        
        console.log(`     ⚠️ لم يتم العثور على صفحة تسجيل أو روابط`);
        return { isRegistrationPage: false };
        
    } catch (error) {
        console.log(`     ❌ خطأ في اكتشاف صفحة التسجيل: ${error.message}`);
        return { isRegistrationPage: false, error: error.message };
    }
}

// ==================== توليد بيانات واقعية ====================
function generateUserData(count) {
    const users = [];
    const firstNames = ['John', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    
    for (let i = 0; i < count; i++) {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        
        users.push({
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`,
            username: `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${randomNum}`,
            password: `Pass${timestamp.toString().slice(-6)}123!`,
        });
    }
    
    return users;
}

// ==================== التسجيل الذكي ====================
async function smartRegistration(page, registrationUrl, userData) {
    console.log(`   🤖 التسجيل بـ ${userData.email}`);
    
    try {
        // الانتقال إلى صفحة التسجيل
        await page.goto(registrationUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        // البحث عن حقول التسجيل بطرق متعددة
        const fieldSelectors = {
            email: [
                'input[type="email"]',
                'input[name*="email"]',
                '#email',
                '[placeholder*="email"]',
                'input[autocomplete="email"]',
                'input[id*="email"]'
            ],
            password: [
                'input[type="password"]',
                'input[name*="password"]',
                '#password',
                '[placeholder*="password"]',
                'input[autocomplete="new-password"]',
                'input[id*="password"]'
            ],
            username: [
                'input[name*="username"]',
                '#username',
                '[placeholder*="username"]',
                'input[id*="username"]',
                'input[name*="user"]'
            ]
        };
        
        let filledFields = 0;
        let emailFilled = false;
        let passwordFilled = false;
        
        // ملء حقل البريد الإلكتروني
        for (const selector of fieldSelectors.email) {
            const element = await page.$(selector);
            if (element) {
                await element.fill(userData.email);
                emailFilled = true;
                filledFields++;
                console.log(`     ✓ تم ملء البريد الإلكتروني`);
                await page.waitForTimeout(200);
                break;
            }
        }
        
        // ملء حقل كلمة المرور
        for (const selector of fieldSelectors.password) {
            const element = await page.$(selector);
            if (element) {
                await element.fill(userData.password);
                passwordFilled = true;
                filledFields++;
                console.log(`     ✓ تم ملء كلمة المرور`);
                await page.waitForTimeout(200);
                break;
            }
        }
        
        if (!emailFilled || !passwordFilled) {
            console.log(`     ⚠️ لم يتم العثور على حقول التسجيل الأساسية`);
            return { success: false, reason: 'Missing required fields' };
        }
        
        // محاولة ملء اسم المستخدم إذا وجد
        for (const selector of fieldSelectors.username) {
            const element = await page.$(selector);
            if (element) {
                await element.fill(userData.username);
                filledFields++;
                console.log(`     ✓ تم ملء اسم المستخدم`);
                await page.waitForTimeout(100);
                break;
            }
        }
        
        // البحث عن زر التسجيل
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Sign Up")',
            'button:has-text("Register")',
            'button:has-text("Create Account")',
            'button:has-text("Join")',
            'button:has-text("Signup")',
            'button:has-text("Submit")',
            '.signup-button',
            '.register-button'
        ];
        
        let submitted = false;
        for (const selector of submitSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    // الانتظار قليلاً قبل النقر
                    await page.waitForTimeout(500);
                    await button.click();
                    submitted = true;
                    console.log(`     ✓ تم النقر على زر التسجيل`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }
        
        if (!submitted) {
            console.log(`     ⚠️ لم يتم العثور على زر تسجيل`);
            return { success: false, reason: 'No submit button found' };
        }
        
        // انتظار النتيجة
        console.log(`     ⏳ انتظار نتيجة التسجيل...`);
        await page.waitForTimeout(8000);
        
        // التحقق من النجاح
        const currentUrl = page.url();
        let pageContent = '';
        try {
            pageContent = (await page.content() || '').toLowerCase();
        } catch (e) {
            pageContent = '';
        }
        
        // مؤشرات النجاح
        const successIndicators = [
            'welcome', 'dashboard', 'profile', 'account',
            'success', 'thank you', 'congratulations',
            'verify your email', 'confirmation email',
            'مرحباً', 'تم التسجيل', 'شكراً'
        ];
        
        const isSuccess = successIndicators.some(indicator => 
            currentUrl.toLowerCase().includes(indicator) || 
            pageContent.includes(indicator)
        );
        
        if (isSuccess) {
            console.log(`     ✅ نجاح التسجيل!`);
            return { 
                success: true, 
                email: userData.email,
                requiresVerification: pageContent.includes('verify') || 
                                    pageContent.includes('confirmation')
            };
        }
        
        console.log(`     ⚠️ لا توجد مؤشرات نجاح واضحة`);
        return { success: false, reason: 'No clear success indicators' };
        
    } catch (error) {
        console.log(`     ❌ خطأ في التسجيل: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

// ==================== الدالة الرئيسية ====================
async function main() {
    try {
        console.log("\n🔍 التحقق من البيئة...");
        
        // التحقق من الأسرار
        const requiredVars = ['GOOGLE_SHEET_URL', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
        for (const envVar of requiredVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing: ${envVar}`);
            }
        }
        console.log("✅ تم التحقق من البيئة");
        
        // استخراج معرف الجدول
        const sheetUrl = process.env.GOOGLE_SHEET_URL;
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) throw new Error('Invalid Google Sheets URL');
        const spreadsheetId = match[1];
        console.log(`📊 Sheet ID: ${spreadsheetId}`);
        
        // الاتصال بـ Google Sheets
        console.log("\n🔗 الاتصال بـ Google Sheets...");
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
        
        // قراءة المنصات
        console.log("\n📖 قراءة المنصات...");
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
        
        // تحليل المنصات
        const platforms = [];
        const startRow = rows[0][0]?.includes('Platform') ? 1 : 0;
        
        for (let i = startRow; i < Math.min(rows.length, startRow + 3); i++) {
            const row = rows[i];
            const platform = {
                rowNumber: i + 1,
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
        
        // بدء المعالجة
        console.log("\n🔄 بدء المعالجة الذكية...");
        console.log("=".repeat(50));
        
        for (const platform of platforms) {
            console.log(`\n🎯 Platform: ${platform.name}`);
            console.log(`   🔗 Original URL: ${platform.url}`);
            console.log(`   👥 Accounts: ${platform.count}`);
            
            const browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            
            // تعيين User Agent
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            try {
                // اكتشاف صفحة التسجيل
                const pageInfo = await findRegistrationPage(page, platform.url);
                
                let registrationResults = [];
                let registrationUrl = platform.url;
                
                // إذا لم تكن صفحة تسجيل ولكن وجدنا روابط
                if (!pageInfo.isRegistrationPage && pageInfo.registrationLinks && pageInfo.registrationLinks.length > 0) {
                    console.log(`   🔗 تجربة روابط التسجيل...`);
                    
                    // تجربة أول رابط تسجيل
                    registrationUrl = pageInfo.registrationLinks[0];
                    console.log(`   🔗 Trying registration link: ${registrationUrl}`);
                    
                    // الانتقال إلى صفحة التسجيل
                    await page.goto(registrationUrl, { waitUntil: 'networkidle' });
                }
                
                // توليد بيانات المستخدمين
                const users = generateUserData(Math.min(platform.count, 2)); // محاولة حسابين فقط للاختبار
                
                // محاولة التسجيل
                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    
                    // إنشاء صفحة جديدة لكل محاولة
                    const newPage = await browser.newPage();
                    await newPage.setExtraHTTPHeaders({
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    });
                    
                    const result = await smartRegistration(newPage, registrationUrl, user);
                    
                    // إغلاق الصفحة بأمان
                    try {
                        await newPage.close();
                    } catch (error) {
                        // تجاهل خطأ الإغلاق
                    }
                    
                    registrationResults.push(result);
                    
                    if (result.success) {
                        console.log(`   ✅ ${i + 1}/${users.length}: ${user.email} - Success`);
                    } else {
                        console.log(`   ❌ ${i + 1}/${users.length}: ${user.email} - ${result.reason}`);
                    }
                    
                    // تأخير بين المحاولات
                    if (i < users.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 4000));
                    }
                }
                
                // حساب النتائج
                const successful = registrationResults.filter(r => r.success).length;
                const total = registrationResults.length;
                
                // تحديث الجدول
                let status = 'NO_REGISTRATION';
                let message = 'No registration page found';
                let emails = '';
                
                if (successful > 0) {
                    status = 'COMPLETED';
                    message = `Created ${successful}/${total} accounts`;
                    emails = registrationResults
                        .filter(r => r.success)
                        .map(r => r.email)
                        .join(', ');
                } else if (pageInfo.isRegistrationPage || pageInfo.registrationLinks) {
                    status = 'REGISTRATION_FAILED';
                    message = 'Registration attempted but failed';
                }
                
                console.log(`   📊 Results: ${successful}/${total} successful`);
                console.log(`   📤 Updating sheet: ${status}`);
                
                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId,
                    resource: {
                        valueInputOption: 'RAW',
                        data: [
                            {
                                range: `D${platform.rowNumber}`,
                                values: [[status]]
                            },
                            {
                                range: `E${platform.rowNumber}`,
                                values: [[message]]
                            },
                            {
                                range: `F${platform.rowNumber}`,
                                values: [[emails]]
                            }
                        ]
                    }
                });
                
            } catch (error) {
                console.log(`   💥 Error: ${error.message}`);
                
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `D${platform.rowNumber}`,
                    valueInputOption: 'RAW',
                    resource: { values: [['ERROR']] }
                });
            } finally {
                await browser.close();
            }
            
            // تأخير بين المنصات
            if (platform !== platforms[platforms.length - 1]) {
                const delay = 8000;
                console.log(`   ⏳ Waiting ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log("\n🎉 System completed!");
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
