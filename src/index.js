// 🚀 WAHAB AI REGISTRATION SYSTEM - الإصدار الذكي
const { google } = require('googleapis');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

console.log("🚀 =========================================");
console.log("🚀 WAHAB AI REGISTRATION SYSTEM");
console.log("🚀 =========================================");
console.log("🤖 الإصدار: 3.0 - التسجيل الذكي");
console.log("📅 " + new Date().toISOString());
console.log("==========================================");

// ==================== نظام الذكاء والذاكرة ====================
const KNOWLEDGE_FILE = 'wahab-knowledge.json';

class AILearningSystem {
    constructor() {
        this.knowledge = this.loadKnowledge();
    }

    loadKnowledge() {
        try {
            if (fs.existsSync(KNOWLEDGE_FILE)) {
                const data = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
                console.log('🧠 تم تحميل المعرفة من الجلسات السابقة');
                return data;
            }
        } catch (error) {
            console.log('🧠 بداية معرفة جديدة');
        }
        return { platforms: {}, strategies: {} };
    }

    saveKnowledge() {
        try {
            fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(this.knowledge, null, 2));
        } catch (error) {
            console.log('⚠️ لم يتم حفظ المعرفة:', error.message);
        }
    }

    recordRegistration(platformName, success, strategy, fieldsUsed, email) {
        if (!this.knowledge.platforms[platformName]) {
            this.knowledge.platforms[platformName] = {
                attempts: 0,
                successes: 0,
                failures: 0,
                strategies: {},
                successfulFields: [],
                emails: []
            };
        }

        const platform = this.knowledge.platforms[platformName];
        platform.attempts++;

        if (success) {
            platform.successes++;
            platform.emails.push({ email, timestamp: new Date().toISOString() });
            
            // تسجيل الحقول الناجحة
            fieldsUsed.forEach(field => {
                if (!platform.successfulFields.includes(field)) {
                    platform.successfulFields.push(field);
                }
            });

            // تسجيل الاستراتيجيات الناجحة
            if (!platform.strategies[strategy]) {
                platform.strategies[strategy] = 0;
            }
            platform.strategies[strategy]++;
            
            console.log(`   🧠 تم تعلم: ${strategy} نجحت لـ ${platformName}`);
        } else {
            platform.failures++;
        }

        platform.successRate = platform.attempts > 0 ? 
            ((platform.successes / platform.attempts) * 100).toFixed(1) : '0.0';
        
        this.saveKnowledge();
    }

    getBestStrategy(platformName) {
        const platform = this.knowledge.platforms[platformName];
        if (platform && Object.keys(platform.strategies).length > 0) {
            // إرجاع الاستراتيجية الأكثر نجاحاً
            return Object.keys(platform.strategies).reduce((a, b) => 
                platform.strategies[a] > platform.strategies[b] ? a : b
            );
        }
        return 'adaptive'; // استراتيجية تكيفية افتراضية
    }

    getSuccessfulFields(platformName) {
        const platform = this.knowledge.platforms[platformName];
        return platform ? platform.successfulFields : [];
    }
}

// ==================== محلل الصفحات الذكي ====================
class SmartPageAnalyzer {
    async analyze(page) {
        const analysis = {
            hasRegistrationForm: false,
            formType: 'unknown',
            fields: [],
            hasCaptcha: false,
            requiresEmailVerification: false,
            difficulty: 'low',
            potentialSubmitButtons: []
        };

        try {
            // تحليل محتوى الصفحة
            const pageContent = await page.content();
            const pageUrl = page.url();
            const pageTitle = await page.title();

            // الكشف عن نماذج التسجيل
            analysis.hasRegistrationForm = await this.detectRegistrationForm(page);
            
            if (analysis.hasRegistrationForm) {
                // تحديد نوع النموذج
                analysis.formType = await this.detectFormType(page);
                
                // استخراج الحقول
                analysis.fields = await this.extractFormFields(page);
                
                // الكشف عن CAPTCHA
                analysis.hasCaptcha = await this.detectCaptcha(page);
                
                // الكشف عن متطلبات التحقق بالبريد
                analysis.requiresEmailVerification = this.detectEmailVerification(pageContent);
                
                // تحديد الصعوبة
                analysis.difficulty = this.calculateDifficulty(analysis);
                
                // البحث عن أزرار الإرسال
                analysis.potentialSubmitButtons = await this.findSubmitButtons(page);
            }

            console.log(`   🔍 تحليل الصفحة: ${analysis.formType}, ${analysis.difficulty}`);
            return analysis;

        } catch (error) {
            console.log('   ⚠️ خطأ في تحليل الصفحة:', error.message);
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
            'form:has(input[type="password"])',
            'form[method="post"]:has(input)'
        ];

        for (const selector of formSelectors) {
            try {
                const form = await page.$(selector);
                if (form) {
                    return true;
                }
            } catch (error) {
                continue;
            }
        }

        // البحث النصي أيضاً
        const content = await page.content().toLowerCase();
        const registrationKeywords = [
            'sign up', 'register', 'create account', 'join now',
            'new account', 'signup', 'registration'
        ];

        return registrationKeywords.some(keyword => content.includes(keyword));
    }

    async detectFormType(page) {
        const inputCount = await page.$$eval('input', inputs => inputs.length);
        
        if (inputCount > 8) return 'extended';
        if (inputCount > 4) return 'standard';
        return 'simple';
    }

    async extractFormFields(page) {
        const fields = await page.$$eval('input, select, textarea', elements => 
            elements.map(el => ({
                type: el.type || el.tagName.toLowerCase(),
                name: el.name || '',
                id: el.id || '',
                placeholder: el.placeholder || '',
                className: el.className || '',
                required: el.required || false,
                autocomplete: el.autocomplete || ''
            }))
        );
        return fields;
    }

    async detectCaptcha(page) {
        const captchaSelectors = [
            '.g-recaptcha',
            '.recaptcha',
            'iframe[src*="recaptcha"]',
            'img[src*="captcha"]',
            '[aria-label*="captcha"]',
            'div[data-sitekey]'
        ];

        for (const selector of captchaSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    return true;
                }
            } catch (error) {
                continue;
            }
        }
        return false;
    }

    detectEmailVerification(content) {
        const verificationKeywords = [
            'verify your email',
            'confirmation email',
            'check your inbox',
            'email verification',
            'confirm your email',
            'verify email address'
        ];

        const lowerContent = content.toLowerCase();
        return verificationKeywords.some(keyword => lowerContent.includes(keyword));
    }

    calculateDifficulty(analysis) {
        let score = 0;
        
        if (analysis.hasCaptcha) score += 3;
        if (analysis.requiresEmailVerification) score += 2;
        if (analysis.formType === 'extended') score += 2;
        if (analysis.fields.length > 6) score += 1;
        
        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    async findSubmitButtons(page) {
        const buttonSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Sign Up")',
            'button:has-text("Register")',
            'button:has-text("Create Account")',
            'button:has-text("Join")',
            'button:has-text("Submit")'
        ];

        const buttons = [];
        for (const selector of buttonSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    buttons.push(selector);
                }
            } catch (error) {
                continue;
            }
        }
        return buttons;
    }
}

// ==================== مسجل الذكي ====================
class IntelligentRegistrar {
    constructor(learningSystem) {
        this.learningSystem = learningSystem;
        this.analyzer = new SmartPageAnalyzer();
    }

    async register(page, url, userData, platformName) {
        console.log(`   🤖 محاولة التسجيل بـ ${userData.email}`);
        
        try {
            // الانتقال إلى الصفحة
            await page.goto(url, { 
                waitUntil: 'networkidle', 
                timeout: 30000 
            });

            // تحليل الصفحة
            const analysis = await this.analyzer.analyze(page);
            
            if (!analysis.hasRegistrationForm) {
                return { 
                    success: false, 
                    reason: 'لم يتم العثور على نموذج تسجيل',
                    strategy: 'none'
                };
            }

            // اختيار أفضل استراتيجية بناءً على المعرفة
            const strategy = this.learningSystem.getBestStrategy(platformName);
            
            // تنفيذ التسجيل
            const result = await this.executeRegistration(
                page, 
                userData, 
                analysis, 
                strategy
            );

            // تسجيل النتيجة للتعلم
            const fieldsUsed = result.fieldsUsed || [];
            this.learningSystem.recordRegistration(
                platformName,
                result.success,
                strategy,
                fieldsUsed,
                userData.email
            );

            return result;

        } catch (error) {
            console.log(`   ❌ خطأ في التسجيل: ${error.message}`);
            return { 
                success: false, 
                reason: error.message,
                strategy: 'error'
            };
        }
    }

    async executeRegistration(page, userData, analysis, strategy) {
        // خريطة استراتيجيات التسجيل
        const strategies = {
            'simple': this.simpleRegistration.bind(this),
            'standard': this.standardRegistration.bind(this),
            'extended': this.extendedRegistration.bind(this),
            'adaptive': this.adaptiveRegistration.bind(this)
        };

        const registrationFunction = strategies[strategy] || strategies.adaptive;
        return await registrationFunction(page, userData, analysis);
    }

    async simpleRegistration(page, userData, analysis) {
        // استراتيجية بسيطة للمواقع السهلة
        const fieldsToFill = ['email', 'password'];
        const filled = await this.fillFields(page, userData, fieldsToFill, analysis.fields);
        
        if (filled >= 2) {
            const submitted = await this.submitForm(page, analysis.potentialSubmitButtons);
            if (submitted) {
                await page.waitForTimeout(3000);
                const success = await this.verifyRegistrationSuccess(page);
                return { 
                    success, 
                    strategy: 'simple',
                    fieldsUsed: fieldsToFill,
                    requiresVerification: analysis.requiresEmailVerification
                };
            }
        }
        
        return { success: false, reason: 'فشل في التسجيل البسيط', strategy: 'simple' };
    }

    async standardRegistration(page, userData, analysis) {
        // استراتيجية قياسية
        const fieldsToFill = ['email', 'password', 'username', 'firstName'];
        const filled = await this.fillFields(page, userData, fieldsToFill, analysis.fields);
        
        if (filled >= 3) {
            const submitted = await this.submitForm(page, analysis.potentialSubmitButtons);
            if (submitted) {
                await page.waitForTimeout(4000);
                const success = await this.verifyRegistrationSuccess(page);
                return { 
                    success, 
                    strategy: 'standard',
                    fieldsUsed: fieldsToFill,
                    requiresVerification: analysis.requiresEmailVerification
                };
            }
        }
        
        return { success: false, reason: 'فشل في التسجيل القياسي', strategy: 'standard' };
    }

    async extendedRegistration(page, userData, analysis) {
        // استراتيجية موسعة للمواقع المعقدة
        const fieldsToFill = ['email', 'password', 'username', 'firstName', 'lastName', 'phone'];
        const filled = await this.fillFields(page, userData, fieldsToFill, analysis.fields);
        
        if (filled >= 4) {
            // محاولة ملء الحقول الإضافية
            await this.fillAdditionalFields(page, userData, analysis.fields);
            
            const submitted = await this.submitForm(page, analysis.potentialSubmitButtons);
            if (submitted) {
                await page.waitForTimeout(5000);
                const success = await this.verifyRegistrationSuccess(page);
                return { 
                    success, 
                    strategy: 'extended',
                    fieldsUsed: fieldsToFill,
                    requiresVerification: analysis.requiresEmailVerification
                };
            }
        }
        
        return { success: false, reason: 'فشل في التسجيل الموسع', strategy: 'extended' };
    }

    async adaptiveRegistration(page, userData, analysis) {
        // استراتيجية تكيفية ذكية
        let selectedStrategy;
        
        switch (analysis.difficulty) {
            case 'high':
                selectedStrategy = this.extendedRegistration;
                break;
            case 'medium':
                selectedStrategy = this.standardRegistration;
                break;
            default:
                selectedStrategy = this.simpleRegistration;
        }
        
        return await selectedStrategy(page, userData, analysis);
    }

    async fillFields(page, userData, fieldTypes, pageFields) {
        const fieldMapping = {
            'email': { 
                selectors: ['input[type="email"]', 'input[name*="email"]', '#email', '[placeholder*="email"]'],
                value: userData.email 
            },
            'password': { 
                selectors: ['input[type="password"]', 'input[name*="password"]', '#password', '[placeholder*="password"]'],
                value: userData.password 
            },
            'username': { 
                selectors: ['input[name*="username"]', '#username', '[placeholder*="username"]'],
                value: userData.username 
            },
            'firstName': { 
                selectors: ['input[name*="first"]', '#first_name', '[placeholder*="first name"]'],
                value: userData.firstName 
            },
            'lastName': { 
                selectors: ['input[name*="last"]', '#last_name', '[placeholder*="last name"]'],
                value: userData.lastName 
            },
            'phone': { 
                selectors: ['input[type="tel"]', 'input[name*="phone"]', '#phone', '[placeholder*="phone"]'],
                value: userData.phone 
            }
        };

        let filledCount = 0;

        for (const fieldType of fieldTypes) {
            const mapping = fieldMapping[fieldType];
            if (!mapping) continue;

            let fieldFilled = false;

            // المحاولة مع المحددات المباشرة
            for (const selector of mapping.selectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        await element.fill(mapping.value);
                        filledCount++;
                        fieldFilled = true;
                        await page.waitForTimeout(50); // محاكاة الكتابة البشرية
                        console.log(`     ✓ ملء حقل ${fieldType}`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            // إذا لم ينجح، البحث في حقول الصفحة
            if (!fieldFilled) {
                for (const field of pageFields) {
                    if (this.fieldNameMatches(field, fieldType)) {
                        const selector = this.createFieldSelector(field);
                        if (selector) {
                            try {
                                const element = await page.$(selector);
                                if (element) {
                                    await element.fill(mapping.value);
                                    filledCount++;
                                    fieldFilled = true;
                                    await page.waitForTimeout(50);
                                    console.log(`     ✓ ملء حقل ${fieldType} (مطابقة ذكية)`);
                                    break;
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                    }
                }
            }
        }

        return filledCount;
    }

    async fillAdditionalFields(page, userData, pageFields) {
        // ملء الحقول الإضافية غير الأساسية
        const additionalMappings = [
            { field: 'birthDate', value: '1990-01-01' },
            { field: 'country', value: 'United States' },
            { field: 'city', value: 'New York' },
            { field: 'zipCode', value: '10001' }
        ];

        for (const mapping of additionalMappings) {
            for (const field of pageFields) {
                if (this.fieldNameMatches(field, mapping.field)) {
                    const selector = this.createFieldSelector(field);
                    if (selector) {
                        try {
                            const element = await page.$(selector);
                            if (element) {
                                await element.fill(mapping.value);
                                await page.waitForTimeout(30);
                                break;
                            }
                        } catch (error) {
                            continue;
                        }
                    }
                }
            }
        }
    }

    fieldNameMatches(field, fieldType) {
        const fieldName = (field.name || field.placeholder || field.id || '').toLowerCase();
        
        const matchPatterns = {
            'email': ['email', 'e-mail'],
            'password': ['password', 'pass', 'pwd'],
            'username': ['username', 'user', 'login'],
            'firstName': ['first', 'fname', 'given'],
            'lastName': ['last', 'lname', 'surname'],
            'phone': ['phone', 'tel', 'mobile'],
            'birthDate': ['birth', 'dob', 'date'],
            'country': ['country', 'nation'],
            'city': ['city', 'town'],
            'zipCode': ['zip', 'postal']
        };

        const patterns = matchPatterns[fieldType] || [];
        return patterns.some(pattern => fieldName.includes(pattern));
    }

    createFieldSelector(field) {
        if (field.name) return `[name="${field.name}"]`;
        if (field.id) return `#${field.id}`;
        if (field.placeholder) return `[placeholder*="${field.placeholder}"]`;
        return null;
    }

    async submitForm(page, potentialButtons) {
        // محاولة النقر على أزرار الإرسال
        for (const buttonSelector of potentialButtons) {
            try {
                const button = await page.$(buttonSelector);
                if (button) {
                    await button.click();
                    console.log('     ✓ تم النقر على زر الإرسال');
                    return true;
                }
            } catch (error) {
                continue;
            }
        }

        // محاولة النقر على أي زر إذا لم يتم العثور على زر محدد
        try {
            const anyButton = await page.$('button');
            if (anyButton) {
                await anyButton.click();
                console.log('     ✓ تم النقر على زر (بديل)');
                return true;
            }
        } catch (error) {
            // تجاهل الخطأ
        }

        return false;
    }

    async verifyRegistrationSuccess(page) {
        const successIndicators = [
            'welcome', 'dashboard', 'profile', 'account',
            'success', 'thank you', 'congratulations',
            'verify your email', 'confirmation',
            'مرحباً', 'تم التسجيل', 'نجاح'
        ];

        try {
            const currentUrl = page.url().toLowerCase();
            const pageContent = await page.content().toLowerCase();

            for (const indicator of successIndicators) {
                if (currentUrl.includes(indicator) || pageContent.includes(indicator)) {
                    return true;
                }
            }

            // التحقق من تغيير العنوان أو ظهور رسالة نجاح
            const pageTitle = await page.title().toLowerCase();
            if (pageTitle.includes('welcome') || pageTitle.includes('success')) {
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }
}

// ==================== توليد بيانات ذكية ====================
function generateIntelligentUserData(count, platformName) {
    const users = [];
    
    // قوائم واقعية للأسماء
    const firstNames = [
        'John', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa', 'James', 'Maria',
        'Robert', 'Jennifer', 'William', 'Linda', 'Joseph', 'Patricia', 'Thomas', 'Susan'
    ];
    
    const lastNames = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Taylor'
    ];
    
    // نطاقات بريد إلكتروني متنوعة
    const emailDomains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'protonmail.com', 'icloud.com', 'aol.com', 'zoho.com'
    ];
    
    // بادئات اسم المستخدم
    const usernamePrefixes = [
        'user', 'player', 'member', 'gamer', 'fan', 'pro', 'star', 'king', 'queen'
    ];
    
    for (let i = 1; i <= count; i++) {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        
        // اختيار اسم عشوائي
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        // اختيار نطاق بريد إلكتروني
        const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
        
        // إنشاء بريد إلكتروني واقعي
        const emailPatterns = [
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`,
            `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${timestamp.toString().slice(-4)}@${domain}`,
            `${firstName.toLowerCase()}_${lastName.toLowerCase()}${i}@${domain}`,
            `${usernamePrefixes[Math.floor(Math.random() * usernamePrefixes.length)]}${timestamp}${randomNum}@${domain}`
        ];
        
        const email = emailPatterns[Math.floor(Math.random() * emailPatterns.length)];
        
        // إنشاء اسم مستخدم
        const username = `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${randomNum}`;
        
        // إنشاء كلمة مرور قوية
        const password = generateStrongPassword();
        
        // إنشاء رقم هاتف واقعي (تنسيق أمريكي)
        const areaCode = Math.floor(200 + Math.random() * 800);
        const prefix = Math.floor(100 + Math.random() * 900);
        const lineNumber = Math.floor(1000 + Math.random() * 9000);
        const phone = `+1${areaCode}${prefix}${lineNumber}`;
        
        users.push({
            firstName,
            lastName,
            email,
            username,
            password,
            phone,
            birthYear: 1985 + Math.floor(Math.random() * 20),
            country: 'United States',
            city: 'New York'
        });
    }
    
    return users;
}

function generateStrongPassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    const length = 12 + Math.floor(Math.random() * 4); // 12-15 حرف
    
    let password = '';
    
    // التأكد من وجود كل أنواع الأحرف
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    // إكمال الباقي
    for (let i = 4; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // خلط كلمة المرور
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ==================== الدالة الرئيسية ====================
async function main() {
    try {
        // التحقق من وسائط التشغيل
        const args = process.argv.slice(2);
        const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'platforms';
        const batchSize = args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 5;
        
        console.log(`⚙️ الوضع: ${mode}`);
        console.log(`📦 حجم الدفعة: ${batchSize}`);
        
        // التحقق من متغيرات البيئة
        console.log("\n🔍 التحقق من متغيرات البيئة...");
        const requiredEnvVars = ['GOOGLE_SHEET_URL', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`❌ متغير بيئة مفقود: ${envVar}`);
            }
        }
        console.log("✅ تم التحقق من البيئة");
        
        // استخراج معرف الجدول
        console.log("\n📊 استخراج معرف الجدول...");
        const sheetUrl = process.env.GOOGLE_SHEET_URL;
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) throw new Error('❌ رابط Google Sheets غير صالح');
        const spreadsheetId = match[1];
        console.log(`✅ معرف الجدول: ${spreadsheetId}`);
        
        // تهيئة نظام الذكاء
        console.log("\n🤖 تهيئة نظام الذكاء...");
        const learningSystem = new AILearningSystem();
        const registrar = new IntelligentRegistrar(learningSystem);
        
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
        
        // قراءة المنصات من الجدول
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
        
        // بدء التسجيل الذكي
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
                strategiesUsed: new Set(),
                message: '',
                details: []
            };
            
            // توليد بيانات المستخدمين
            const users = generateIntelligentUserData(platform.count, platform.name);
            
            // إنشاء متصفح جديد لهذه المنصة
            const browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            try {
                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    
                    // إنشاء صفحة جديدة لكل محاولة تسجيل
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
                    const registrationResult = await registrar.register(
                        page, 
                        platform.url, 
                        user, 
                        platform.name
                    );
                    
                    // إغلاق الصفحة
                    await page.close();
                    
                    // تسجيل النتيجة
                    if (registrationResult.success) {
                        result.accountsCreated++;
                        result.createdEmails.push(user.email);
                        if (registrationResult.strategy) {
                            result.strategiesUsed.add(registrationResult.strategy);
                        }
                        result.details.push({
                            email: user.email,
                            success: true,
                            strategy: registrationResult.strategy,
                            requiresVerification: registrationResult.requiresVerification,
                            timestamp: new Date().toISOString()
                        });
                        console.log(`   ✅ ${i + 1}/${platform.count}: ${user.email} - نجاح`);
                    } else {
                        result.accountsFailed++;
                        result.details.push({
                            email: user.email,
                            success: false,
                            reason: registrationResult.reason,
                            strategy: registrationResult.strategy,
                            timestamp: new Date().toISOString()
                        });
                        console.log(`   ❌ ${i + 1}/${platform.count}: ${user.email} - فشل`);
                    }
                    
                    // تأخير ذكي بين الحسابات (2-5 ثواني)
                    if (i < users.length - 1) {
                        const delay = 2000 + Math.random() * 3000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                
                // تحديث رسالة النتيجة
                result.message = `تم إنشاء ${result.accountsCreated}/${platform.count} حساب`;
                if (result.strategiesUsed.size > 0) {
                    result.message += ` باستخدام ${Array.from(result.strategiesUsed).join('، ')}`;
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
            
            // تأخير ذكي بين المنصات (8-12 ثانية)
            if (platform !== pendingPlatforms[pendingPlatforms.length - 1]) {
                const delay = 8000 + Math.random() * 4000;
                console.log(`   ⏳ انتظار ${Math.round(delay/1000)} ثانية للمنصة التالية...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // حفظ المعرفة المكتسبة
        learningSystem.saveKnowledge();
        
        // إنشاء تقرير النتائج
        console.log("\n" + "=".repeat(50));
        console.log("📊 تقرير التسجيل الذكي");
        console.log("=".repeat(50));
        
        const totalCreated = results.reduce((sum, r) => sum + r.accountsCreated, 0);
        const totalFailed = results.reduce((sum, r) => sum + r.accountsFailed, 0);
        const totalRequested = pendingPlatforms.reduce((sum, p) => sum + p.count, 0);
        const successRate = totalRequested > 0 ? (totalCreated /
