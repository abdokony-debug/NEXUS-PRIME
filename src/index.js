// WAHAB AI Registration System - الإصدار الذكي
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// استيراد المكونات
const BrowserManager = require('./core/browser');
const EmailManager = require('./core/email');
const CaptchaSolver = require('./core/captcha');
const AI = require('./core/intelligence');
const DataGenerator = require('./utils/dataGenerator');
const Logger = require('./utils/logger');
const Database = require('./utils/db');

// استيراد معالجات المنصات
const platformHandlers = {
    'gamee': require('./platforms/gamee'),
    'freecash': require('./platforms/freecash'),
    'pawns': require('./platforms/pawns'),
    'extrabux': require('./platforms/extrabux'),
    'swagbucks': require('./platforms/swagbucks')
};

class WAHABAISystem {
    constructor() {
        this.logger = new Logger();
        this.db = new Database();
        this.ai = new AI();
        this.browser = new BrowserManager();
        this.email = new EmailManager();
        this.captcha = new CaptchaSolver();
        this.generator = new DataGenerator();
    }

    async initialize() {
        console.log('🤖 WAHAB AI System - الذكي للتسجيل التلقائي');
        console.log('🚀 الإصدار: 2.0 - التعلم الذاتي والتكيف');
        
        // تهيئة المكونات
        await this.db.connect();
        await this.ai.train();
        this.logger.info('System initialized');
    }

    async processPlatform(platformData) {
        const { name, url, count, rowNumber } = platformData;
        
        console.log(`\n🎯 معالجة: ${name}`);
        console.log(`   🔗 الرابط: ${url}`);
        console.log(`   👥 عدد الحسابات: ${count}`);
        
        // تحديد المعالج المناسب
        let handler = platformHandlers[name.toLowerCase()];
        if (!handler) {
            handler = this.ai.detectHandler(url);
        }
        
        const results = [];
        
        for (let i = 0; i < count; i++) {
            console.log(`\n   ${i + 1}/${count}: إنشاء حساب...`);
            
            try {
                // توليد بيانات واقعية
                const userData = await this.generator.generateRealisticUser();
                
                // إنشاء بريد إلكتروني قابل للتحقق
                const emailAccount = await this.email.createTempEmail();
                userData.email = emailAccount.email;
                
                // تشغيل المتصفح
                const context = await this.browser.createContext();
                
                // التنفيذ الذكي
                const result = await this.executeIntelligentRegistration(
                    context, 
                    url, 
                    userData, 
                    handler
                );
                
                results.push(result);
                
                // حفظ في قاعدة البيانات
                await this.db.saveAccount({
                    platform: name,
                    ...userData,
                    status: result.success ? 'active' : 'failed',
                    created_at: new Date()
                });
                
                // التعلم من النتيجة
                await this.ai.learnFromResult(result);
                
            } catch (error) {
                this.logger.error(`فشل في الحساب ${i + 1}:`, error);
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    async executeIntelligentRegistration(context, url, userData, handler) {
        const page = await context.newPage();
        
        try {
            // الذهاب إلى الموقع
            await page.goto(url, { waitUntil: 'networkidle' });
            
            // تحليل الصفحة باستخدام الذكاء الاصطناعي
            const pageAnalysis = await this.ai.analyzePage(page);
            
            // تحديد استراتيجية التسجيل
            const strategy = this.ai.selectStrategy(pageAnalysis);
            
            let registrationResult;
            
            // استخدام المعالج المخصص إن وجد
            if (handler && handler.register) {
                registrationResult = await handler.register(page, userData);
            } else {
                // استخدام الاستراتيجية الذكية العامة
                registrationResult = await this.ai.executeStrategy(
                    page, 
                    userData, 
                    strategy
                );
            }
            
            // التحقق من البريد الإلكتروني إذا لزم الأمر
            if (registrationResult.requiresEmailVerification) {
                const verified = await this.verifyEmail(userData.email);
                registrationResult.emailVerified = verified;
            }
            
            // التقاط لقطات شاشة للإثبات
            if (registrationResult.success) {
                await page.screenshot({ 
                    path: `screenshots/${userData.username}-${Date.now()}.png` 
                });
            }
            
            await page.close();
            return registrationResult;
            
        } catch (error) {
            await page.close();
            throw error;
        }
    }

    async verifyEmail(email) {
        console.log('   📧 التحقق من البريد الإلكتروني...');
        
        // الانتظار لبريد التحقق
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // استخدام خدمة بريد مؤقت للتحقق
        const verificationLink = await this.email.checkForVerification(email);
        
        if (verificationLink) {
            const verifyPage = await this.browser.createPage();
            await verifyPage.goto(verificationLink);
            await verifyPage.close();
            return true;
        }
        
        return false;
    }

    async updateGoogleSheets(results, platformData) {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
        
        const successful = results.filter(r => r.success).length;
        const accounts = results.map(r => r.email).join(', ');
        
        // تحديث الجدول
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            resource: {
                valueInputOption: 'RAW',
                data: [
                    {
                        range: `D${platformData.rowNumber}`,
                        values: [[successful === platformData.count ? 'COMPLETED' : 'PARTIAL']]
                    },
                    {
                        range: `E${platformData.rowNumber}`,
                        values: [[`تم إنشاء ${successful}/${platformData.count} حساب`]]
                    },
                    {
                        range: `F${platformData.rowNumber}`,
                        values: [[accounts]]
                    }
                ]
            }
        });
    }
}

// الدالة الرئيسية
async function main() {
    const system = new WAHABAISystem();
    
    try {
        await system.initialize();
        
        // قراءة من Google Sheets
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'A:D'
        });

        const rows = response.data.values || [];
        const startRow = rows[0] && rows[0][0].includes('Platform') ? 1 : 0;
        
        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            const platformData = {
                name: row[0] || `Platform_${i}`,
                url: row[1] || '',
                count: parseInt(row[2]) || 0,
                rowNumber: i + 1,
                status: row[3] || 'PENDING'
            };

            if (platformData.url && platformData.url.startsWith('http') && platformData.count > 0) {
                if (platformData.status === 'PENDING' || platformData.status === '') {
                    const results = await system.processPlatform(platformData);
                    await system.updateGoogleSheets(results, platformData);
                }
            }
        }
        
        console.log('\n🎉 اكتمل النظام بنجاح!');
        console.log('📊 يمكنك رؤية النتائج في Google Sheets والبيانات المحفوظة.');
        
    } catch (error) {
        console.error('❌ فشل النظام:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = WAHABAISystem;
