// WAHAB AI Registration System - الإصدار الذكي المدمج
const { google } = require('googleapis');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

console.log("🚀 =========================================");
console.log("🚀 WAHAB AI REGISTRATION SYSTEM - الذكي");
console.log("🚀 =========================================");

// ==================== نظام التعلم الذاتي ====================
class LearningSystem {
    constructor() {
        this.platformKnowledge = {};
        this.loadKnowledge();
    }

    loadKnowledge() {
        try {
            if (fs.existsSync('knowledge.json')) {
                this.platformKnowledge = JSON.parse(fs.readFileSync('knowledge.json', 'utf8'));
                console.log('🧠 تم تحميل المعرفة السابقة');
            }
        } catch (error) {
            this.platformKnowledge = {};
        }
    }

    saveKnowledge() {
        fs.writeFileSync('knowledge.json', JSON.stringify(this.platformKnowledge, null, 2));
    }

    learn(platformName, success, strategy, fieldsUsed) {
        if (!this.platformKnowledge[platformName]) {
            this.platformKnowledge[platformName] = {
                attempts: 0,
                successes: 0,
                strategies: [],
                fields: []
            };
        }

        const knowledge = this.platformKnowledge[platformName];
        knowledge.attempts++;
        
        if (success) {
            knowledge.successes++;
            if (!knowledge.strategies.includes(strategy)) {
                knowledge.strategies.push(strategy);
            }
            fieldsUsed.forEach(field => {
                if (!knowledge.fields.includes(field)) {
                    knowledge.fields.push(field);
                }
            });
        }

        knowledge.successRate = (knowledge.successes / knowledge.attempts * 100).toFixed(1);
        this.saveKnowledge();
    }

    getBestStrategy(platformName) {
        if (this.platformKnowledge[platformName] && this.platformKnowledge[platformName].strategies.length > 0) {
            return this.platformKnowledge[platformName].strategies[0];
        }
        return 'adaptive'; // استراتيجية تكيفية
    }
}

// ==================== محلل الصفحة الذكي ====================
class PageAnalyzer {
    async analyze(page) {
        const analysis = {
            hasForm: false,
            formType: 'unknown',
            fields: [],
            captcha: false,
            requiresEmail: false,
            complexity: 'low'
        };

        try {
            // تحليل محتوى الصفحة
            const content = await page.content();
            const url = page.url();

            // الكشف عن نماذج التسجيل
            analysis.hasForm = await this.detectRegistrationForm(page);
            
            if (analysis.hasForm) {
                analysis.formType = await this.detectFormType(page);
                analysis.fields = await this.extractFormFields(page);
                analysis.captcha = await this.detectCaptcha(page);
                analysis.requiresEmail = await this.detectEmailRequirement(content);
                analysis.complexity = this.calculateComplexity(analysis);
            }

            return analysis;
        } catch (error) {
            return analysis;
        }
    }

    async detectRegistrationForm(page) {
        const formSelectors = [
            'form[action*="register"]',
            'form[action*="signup"]',
            'form[action*="create"]',
            'form[action*="join"]',
            'form:has(input[type="email"])',
            'form:has(input[type="password"])'
        ];

        for (const selector of formSelectors) {
            const element = await page.$(selector);
            if (element) return true;
        }

        return false;
    }

    async detectFormType(page) {
        const fields = await page.$$('input, select, textarea');
        
        if (fields.length > 8) return 'extended';
        if (fields.length > 4) return 'standard';
        return 'simple';
    }

    async extractFormFields(page) {
        const fields = await page.$$eval('input, select, textarea', elements => 
            elements.map(el => ({
                type: el.type || el.tagName.toLowerCase(),
                name: el.name || el.id || '',
                placeholder: el.placeholder || '',
                required: el.required
            }))
        );
        return fields;
    }

    async detectCaptcha(page) {
        const captchaIndicators = [
            'iframe[src*="recaptcha"]',
            'div.g-recaptcha',
            'img[src*="captcha"]',
            'input[name*="captcha"]',
            '*[aria-label*="captcha"]'
        ];

        for (const selector of captchaIndicators) {
            const element = await page.$(selector);
            if (element) return true;
        }

        return false;
    }

    async detectEmailRequirement(content) {
        const indicators = [
            'verify your email',
            'confirmation email',
            'check your inbox',
            'email verification',
            'confirm your email'
        ];

        const lowerContent = content.toLowerCase();
        return indicators.some(indicator => lowerContent.includes(indicator));
    }

    calculateComplexity(analysis) {
        let score = 0;
        if (analysis.captcha) score += 3;
        if (analysis.requiresEmail) score += 2;
        if (analysis.formType === 'extended') score += 2;
        if (analysis.fields.length > 6) score += 1;

        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }
}

// ==================== مسجل ذكي ====================
class SmartRegistrar {
    constructor(learningSystem) {
        this.learningSystem = learningSystem;
        this.analyzer = new PageAnalyzer();
        this.strategies = {
            simple: this.simpleStrategy.bind(this),
            standard: this.standardStrategy.bind(this),
            extended: this.extendedStrategy.bind(this),
            adaptive: this.adaptiveStrategy.bind(this)
        };
    }

    async register(page, url, userData, platformName) {
        console.log(`   🧠 تطبيق استراتيجية ذكية لـ: ${platformName}`);
        
        try {
            // تحليل الصفحة
            const analysis = await this.analyzer.analyze(page);
            
            if (!analysis.hasForm) {
                return { success: false, reason: 'No registration form found' };
            }

            // اختيار الاستراتيجية
            const strategyName = this.learningSystem.getBestStrategy(platformName);
            const strategy = this.strategies[strategyName] || this.strategies.adaptive;
            
            // تنفيذ التسجيل
            const result = await strategy(page, userData, analysis);
            
            // التعلم من النتيجة
            const fieldsUsed = analysis.fields.map(f => f.name || f.type).filter(f => f);
            this.learningSystem.learn(
                platformName, 
                result.success, 
                strategyName, 
                fieldsUsed
            );

            return result;

        } catch (error) {
            return { success: false, reason: error.message };
        }
    }

    async simpleStrategy(page, userData, analysis) {
        // استراتيجية بسيطة للمواقع السهلة
        const filled = await this.fillCommonFields(page, userData, ['email', 'password']);
        
        if (filled >= 2) {
            await this.clickSubmit(page);
            await page.waitForTimeout(3000);
            
            const success = await this.verifySuccess(page);
            return { 
                success, 
                strategy: 'simple',
                requiresVerification: analysis.requiresEmail 
            };
        }
        
        return { success: false, reason: 'Could not fill required fields' };
    }

    async standardStrategy(page, userData, analysis) {
        // استراتيجية قياسية للمواقع المتوسطة
        const fields = ['email', 'password', 'username', 'firstName', 'lastName'];
        const filled = await this.fillCommonFields(page, userData, fields);
        
        if (filled >= 3) {
            await this.clickSubmit(page);
            await page.waitForTimeout(4000);
            
            const success = await this.verifySuccess(page);
            return { 
                success, 
                strategy: 'standard',
                requiresVerification: analysis.requiresEmail 
            };
        }
        
        return { success: false, reason: 'Could not fill enough fields' };
    }

    async extendedStrategy(page, userData, analysis) {
        // استراتيجية موسعة للمواقع المعقدة
        const fields = ['email', 'password', 'username', 'firstName', 'lastName', 'phone', 'birthday'];
        const filled = await this.fillCommonFields(page, userData, fields);
        
        if (filled >= 4) {
            // محاولة ملء الحقول المخصصة
            await this.fillCustomFields(page, userData, analysis.fields);
            
            await this.clickSubmit(page);
            await page.waitForTimeout(5000);
            
            const success = await this.verifySuccess(page);
            return { 
                success, 
                strategy: 'extended',
                requiresVerification: analysis.requiresEmail 
            };
        }
        
        return { success: false, reason: 'Could not fill required fields' };
    }

    async adaptiveStrategy(page, userData, analysis) {
        // استراتيجية تكيفية ذكية
        let strategy;
        
        switch (analysis.complexity) {
            case 'high':
                strategy = this.extendedStrategy;
                break;
            case 'medium':
                strategy = this.standardStrategy;
                break;
            default:
                strategy = this.simpleStrategy;
        }
        
        return await strategy(page, userData, analysis);
    }

    async fillCommonFields(page, userData, fieldTypes) {
        const fieldMap = {
            email: ['input[type="email"]', 'input[name*="email"]', '#email'],
            password: ['input[type="password"]', 'input[name*="password"]', '#password'],
            username: ['input[name*="username"]', '#username', 'input[placeholder*="username"]'],
            firstName: ['input[name*="first"]', 'input[name*="name"]', '#firstName'],
            lastName: ['input[name*="last"]', '#lastName'],
            phone: ['input[type="tel"]', 'input[name*="phone"]', '#phone'],
            birthday: ['input[type="date"]', 'input[name*="birth"]', '#birthday']
        };

        let filledCount = 0;

        for (const fieldType of fieldTypes) {
            const selectors = fieldMap[fieldType];
            if (!selectors) continue;

            for (const selector of selectors) {
                const element = await page.$(selector);
                if (element) {
                    const value = this.getFieldValue(fieldType, userData);
                    if (value) {
                        await element.fill(value);
                        filledCount++;
                        await page.waitForTimeout(100); // محاكاة الكتابة البشرية
                        break;
                    }
                }
            }
        }

        return filledCount;
    }

    async fillCustomFields(page, userData, fields) {
        for (const field of fields) {
            if (!field.name && !field.placeholder) continue;
            
            const selector = field.name ? `[name="${field.name}"]` : `[placeholder*="${field.placeholder}"]`;
            const element = await page.$(selector);
            
            if (element) {
                const value = this.guessFieldValue(field, userData);
                if (value) {
                    await element.fill(value);
                    await page.waitForTimeout(50);
                }
            }
        }
    }

    getFieldValue(fieldType, userData) {
        const values = {
            email: userData.email,
            password: userData.password,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            birthday: '1990-01-01'
        };
        return values[fieldType];
    }

    guessFieldValue(field, userData) {
        const fieldName = (field.name || field.placeholder || '').toLowerCase();
        
        if (fieldName.includes('email')) return userData.email;
        if (fieldName.includes('password')) return userData.password;
        if (fieldName.includes('user')) return userData.username;
        if (fieldName.includes('first')) return userData.firstName;
        if (fieldName.includes('last')) return userData.lastName;
        if (fieldName.includes('phone') || fieldName.includes('tel')) return userData.phone;
        if (fieldName.includes('birth') || fieldName.includes('date')) return '1990-01-01';
        if (fieldName.includes('country')) return 'United States';
        if (fieldName.includes('city')) return 'New York';
        
        return null;
    }

    async clickSubmit(page) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Sign Up")',
            'button:has-text("Register")',
            'button:has-text("Create Account")',
            'button:has-text("Join")'
        ];

        for (const selector of submitSelectors) {
            const element = await page.$(selector);
            if (element) {
                await element.click();
                return true;
            }
        }

        return false;
    }

    async verifySuccess(page) {
        const successIndicators = [
            'welcome', 'dashboard', 'profile', 'account',
            'success', 'thank you', 'congratulations',
            'verify your email', 'confirmation'
        ];

        const currentUrl = page.url().toLowerCase();
        const content = await page.content().toLowerCase();

        for (const indicator of successIndicators) {
            if (currentUrl.includes(indicator) || content.includes(indicator)) {
                return true;
            }
        }

        return false;
    }
}

// ==================== توليد بيانات ذكية ====================
function generateIntelligentUserData(count, platformName) {
    const users = [];
    const domains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'protonmail.com', 'zoho.com', 'mail.com', 'yandex.com'
    ];
    
    const firstNames = ['John', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa', 'James', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    for (let i = 1; i <= count; i++) {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        // إنشاء بريد إلكتروني واقعي
        const emailPatterns = [
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`,
            `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${timestamp.toString().slice(-4)}@${domain}`,
            `${firstName.toLowerCase()}_${lastName.toLowerCase()}${i}@${domain}`
        ];
        
        const email = emailPatterns[Math.floor(Math.random() * emailPatterns.length)];
        
        users.push({
            firstName,
            lastName,
            email,
            username: `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${randomNum}`,
            password: this.generateStrongPassword(),
            phone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
            birthYear: 1985 + Math.floor(Math.random() * 20),
            country: 'United States',
            city: 'New York'
        });
    }
    
    return users;
}

function generateStrongPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const length = 12 + Math.floor(Math.random() * 4);
    let password = '';
    
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // التأكد من وجود حرف كبير ورقم وحرف خاص
    if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
    if (!/[0-9]/.test(password)) password = password.slice(0, -1) + '1';
    if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '!';
    
    return password;
}

// ==================== النظام الرئيسي المحدث ====================
async function main() {
    const learningSystem = new LearningSystem();
    const smartRegistrar = new SmartRegistrar(learningSystem);
    
    try {
        console.log("📅 " + new Date().toISOString());
        
        // الحصول على الوسائط
        const args = process.argv.slice(2);
        const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'intelligent';
        const batchSize = args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 3;
        
        console.log(`⚙️ الوضع: ${mode} (${mode === 'intelligent' ? 'ذكي' : 'سريع'})`);
        console.log(`📦 الحجم: ${batchSize}`);
        
        // التحقق من متغيرات البيئة
        console.log("\n🔍 التحقق من متغيرات البيئة...");
        const requiredVars = ['GOOGLE_SHEET_URL', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
        for (const envVar of requiredVars) {
            if (!process.env[envVar]) {
                throw new Error(`متغير بيئة مفقود: ${envVar}`);
            }
        }
        console.log("✅ تم التحقق من البيئة");
        
        // استخراج معرف الجدول
        console.log("\n📊 استخراج معرف الجدول...");
        const sheetUrl = process.env.GOOGLE_SHEET_URL;
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) throw new Error('رابط Google Sheets غير صالح');
        const spreadsheetId = match[1];
        console.log(`✅ معرف الجدول: ${spreadsheetId}`);
        
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
        try {
            const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
            console.log(`✅ متصل بـ: "${sheetInfo.data.properties.title}"`);
        } catch (error) {
            console.error("❌ فشل الاتصال بـ Google Sheets:", error.message);
            throw error;
        }
        
        // قراءة البيانات من الجدول
        console.log("\n📖 قراءة المنصات من الجدول...");
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:D',
        });
        
        const rows = response.data.values || [];
        console.log(`📊 إجمالي الصفوف: ${rows.length}`);
        
        if (rows.length === 0) {
            console.log("✅ لا توجد بيانات للمعالجة");
            process.exit(0);
        }
        
        // تحليل المنصات
        const platforms = [];
        const hasHeader = rows[0] && (
            rows[0][0]?.toLowerCase().includes('platform') || 
            rows[0][1]?.toLowerCase().includes('link')
        );
        
        const startRow = hasHeader ? 1 : 0;
        
        for (let i = startRow; i < rows.length; i++) {
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
        
        console.log(`✅ تم العثور على ${platforms.length} منصة صالحة`);
        
        // تصفية المنصات المعلقة
        const pendingPlatforms = platforms
            .filter(p => !p.status || p.status === '' || p.status === 'PENDING')
            .slice(0, batchSize);
        
        console.log(`🔄 معالجة ${pendingPlatforms.length} منصة معلقة`);
        
        if (pendingPlatforms.length === 0) {
            console.log("✅ لا توجد منصات معلقة للمعالجة");
            process.exit(0);
        }
        
        // إنشاء مجلد للنتائج
        if (!fs.existsSync('results')) {
            fs.mkdirSync('results');
        }
        
        // معالجة كل منصة
        console.log("\n" + "=".repeat(50));
        console.log("🧠 بدء التسجيل الذكي");
        console.log("=".repeat(50));
        
        const results = [];
        
        for (const platform of pendingPlatforms) {
            console.log(`\n🎯 معالجة: ${platform.name}`);
            console.log(`   🔗 الرابط: ${platform.url}`);
            console.log(`   👥 عدد الحسابات: ${platform.count}`);
            console.log(`   📍 الصف: ${platform.rowNumber}`);
            
            const result = {
                platform: platform.name,
                accountsCreated: 0,
                accountsFailed: 0,
                createdEmails: [],
                strategiesUsed: [],
                message: '',
                details: []
            };
            
            // توليد بيانات المستخدمين الذكية
            const users = generateIntelligentUserData(platform.count, platform.name);
            
            // إنشاء متصفح لهذه المنصة
            const browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            try {
                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    
                    // إنشاء صفحة جديدة لكل حساب
                    const page = await browser.newPage();
                    
                    // تعيين User Agent واقعي
                    const userAgents = [
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ];
                    
                    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                    await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
                    
                    // محاولة التسجيل الذكي
                    console.log(`   ${i + 1}/${platform.count}: التسجيل بـ ${user.email}`);
                    
                    const registrationResult = await smartRegistrar.register(
                        page, 
                        platform.url, 
                        user, 
                        platform.name
                    );
                    
                    // إغلاق الصفحة
                    await page.close();
                    
                    if (registrationResult.success) {
                        result.accountsCreated++;
                        result.createdEmails.push(user.email);
                        if (registrationResult.strategy && !result.strategiesUsed.includes(registrationResult.strategy)) {
                            result.strategiesUsed.push(registrationResult.strategy);
                        }
                        result.details.push({
                            email: user.email,
                            success: true,
                            strategy: registrationResult.strategy,
                            requiresVerification: registrationResult.requiresVerification
                        });
                        console.log(`   ✅ ${user.email} - نجاح (${registrationResult.strategy || 'unknown'})`);
                    } else {
                        result.accountsFailed++;
                        result.details.push({
                            email: user.email,
                            success: false,
                            reason: registrationResult.reason
                        });
                        console.log(`   ❌ ${user.email} - فشل (${registrationResult.reason})`);
                    }
                    
                    // تأخير ذكي بين الحسابات
                    if (i < users.length - 1) {
                        const delay = 2000 + Math.random() * 3000; // 2-5 ثواني
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                
                result.message = `تم إنشاء ${result.accountsCreated}/${platform.count} حساب`;
                if (result.strategiesUsed.length > 0) {
                    result.message += ` باستخدام ${result.strategiesUsed.join('، ')}`;
                }
                console.log(`   📊 ${result.message}`);
                
            } catch (error) {
                console.log(`   💥 خطأ في معالجة المنصة: ${error.message}`);
                result.message = `خطأ: ${error.message}`;
            } finally {
                await browser.close();
            }
            
            results.push(result);
            
            // تحديث Google Sheets
            try {
                const status = result.accountsCreated > 0 ? 'COMPLETED' : 'FAILED';
                const notes = result.message;
                const accounts = result.createdEmails.join(', ');
                
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
                                values: [[notes]]
                            },
                            {
                                range: `F${platform.rowNumber}`,
                                values: [[accounts]]
                            }
                        ]
                    }
                });
                
                console.log(`   📤 تم تحديث الجدول: ${status}`);
                
            } catch (updateError) {
                console.log(`   ⚠️ لم يتمكن من تحديث الجدول: ${updateError.message}`);
            }
            
            // تأخير ذكي بين المنصات
            if (platform !== pendingPlatforms[pendingPlatforms.length - 1]) {
                const delay = 8000 + Math.random() * 4000; // 8-12 ثانية
                console.log(`   ⏳ انتظار ${Math.round(delay/1000)} ثانية للمنصة التالية...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // حفظ المعرفة والنقاط
        learningSystem.saveKnowledge();
        
        // إنشاء تقرير ذكي
        console.log("\n" + "=".repeat(50));
        console.log("📊 تقرير التسجيل الذكي");
        console.log("=".repeat(50));
        
        const totalCreated = results.reduce((sum, r) => sum + r.accountsCreated, 0);
        const totalFailed = results.reduce((sum, r) => sum + r.accountsFailed, 0);
        const totalRequested = pendingPlatforms.reduce((sum, p) => sum + p.count, 0);
        const successRate = (totalCreated / totalRequested * 100).toFixed(1);
        
        console.log(`🎯 المنصات المعالجة: ${results.length}`);
        console.log(`📋 الحسابات المطلوبة: ${totalRequested}`);
        console.log(`✅ الحسابات المخلوقة: ${totalCreated}`);
        console.log(`❌ الحسابات الفاشلة: ${totalFailed}`);
        console.log(`📈 معدل النجاح: ${successRate}%`);
        
        // عرض المعرفة المكتسبة
        console.log("\n🧠 المعرفة المكتسبة:");
        Object.keys(learningSystem.platformKnowledge).forEach(platform => {
            const knowledge = learningSystem.platformKnowledge[platform];
            console.log(`   ${platform}: ${knowledge.successRate}% نجاح (${knowledge.successes}/${knowledge.attempts})`);
        });
        
        // حفظ التقرير التفصيلي
        const report = {
            date: new Date().toISOString(),
            mode: mode,
            platformsProcessed: results.length,
            results: results,
            summary: {
                totalRequested,
                totalCreated,
                totalFailed,
                successRate
            },
            knowledge: learningSystem.platformKnowledge
        };
        
        const reportFile = `results/report-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 تم حفظ التقرير في: ${reportFile}`);
        
        console.log("\n" + "=".repeat(50));
        console.log("🎉 اكتمل النظام الذكي بنجاح!");
        console.log("🧠 النظام يتعلم ويتحسن مع كل تشغيل");
        console.log("=".repeat(50));
        
        process.exit(0);
        
    } catch (error) {
        console.error("\n" + "=".repeat(50));
        console.error("❌ فشل النظام الذكي!");
        console.error("=".repeat(50));
        console.error("الخطأ:", error.message);
        console.error("Stack:", error.stack);
        process.exit(1);
    }
}

// تشغيل النظام
if (require.main === module) {
    main().catch(error => {
        console.error("خطأ فادح:", error);
        process.exit(1);
    });
}
