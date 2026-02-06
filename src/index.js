// src/index.js
const { chromium } = require('playwright');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WahabAISystem {
    constructor(config) {
        this.config = config;
        this.results = [];
        this.knowledge = this.loadKnowledge();
        this.browser = null;
        this.context = null;
        this.sheetsClient = null;
        
        // إعداد مجلدات النتائج
        this.resultsDir = path.join(__dirname, '..', 'results');
        this.screenshotsDir = path.join(__dirname, '..', 'screenshots');
        this.logsDir = path.join(__dirname, '..', 'logs');
        
        this.ensureDirectories();
        this.setupLogging();
        
        // إصلاح: التأكد من وجود استراتيجية للوضع الحالي
        this.ensureStrategies();
    }

    ensureStrategies() {
        if (!this.knowledge.strategies) {
            this.knowledge.strategies = {};
        }
        
        const defaultStrategies = {
            'intelligent': {
                delay: { min: 1500, max: 4000 },
                retries: 3,
                headless: false
            },
            'fast': {
                delay: { min: 500, max: 1500 },
                retries: 1,
                headless: true
            },
            'stealth': {
                delay: { min: 3000, max: 8000 },
                retries: 5,
                headless: false
            }
        };
        
        // إضافة الاستراتيجيات المفقودة
        Object.keys(defaultStrategies).forEach(mode => {
            if (!this.knowledge.strategies[mode]) {
                this.knowledge.strategies[mode] = defaultStrategies[mode];
            }
        });
    }

    ensureDirectories() {
        [this.resultsDir, this.screenshotsDir, this.logsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    setupLogging() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(this.logsDir, `ai-log-${timestamp}.txt`);
        
        // إعادة توجيه console.log إلى الملف
        const originalLog = console.log;
        console.log = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
            ).join(' ');
            
            originalLog.apply(console, args);
            fs.appendFileSync(this.logFile, `${new Date().toISOString()} - ${message}\n`);
        };
    }

    loadKnowledge() {
        const knowledgePath = path.join(__dirname, '..', 'knowledge.json');
        if (fs.existsSync(knowledgePath)) {
            try {
                return JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
            } catch (error) {
                console.error('Error loading knowledge:', error);
                return this.createDefaultKnowledge();
            }
        }
        return this.createDefaultKnowledge();
    }

    createDefaultKnowledge() {
        return {
            version: '2.0',
            platforms: {},
            successPatterns: [],
            failurePatterns: [],
            strategies: {
                intelligent: {
                    delay: { min: 1500, max: 4000 },
                    retries: 3,
                    headless: false
                },
                fast: {
                    delay: { min: 500, max: 1500 },
                    retries: 1,
                    headless: true
                },
                stealth: {
                    delay: { min: 3000, max: 8000 },
                    retries: 5,
                    headless: false
                }
            },
            userAgents: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
            ],
            statistics: {
                totalRuns: 0,
                totalAccountsCreated: 0,
                totalSuccessRate: 0,
                lastRun: null
            }
        };
    }

    async initGoogleSheets() {
        try {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheetsClient = google.sheets({ version: 'v4', auth });
            console.log('✅ Google Sheets initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Google Sheets:', error.message);
            return false;
        }
    }

    async getAccountsFromSheet() {
        try {
            const sheetId = process.env.GOOGLE_SHEET_ID;
            
            // محاولة نطاقات مختلفة
            const possibleRanges = ['Sheet1!A:F', 'Accounts!A:Z', 'Data!A:F', 'A:F'];
            
            for (const range of possibleRanges) {
                try {
                    console.log(`📋 Trying to read range: ${range}`);
                    
                    const response = await this.sheetsClient.spreadsheets.values.get({
                        spreadsheetId: sheetId,
                        range: range
                    });

                    const rows = response.data.values;
                    
                    if (rows && rows.length > 0) {
                        console.log(`✅ Found ${rows.length} rows in range: ${range}`);
                        
                        // إذا كان هناك رؤوس، نتخطاها
                        const startIndex = rows[0][0]?.toLowerCase().includes('name') ||
                                          rows[0][0]?.toLowerCase().includes('first') ? 1 : 0;
                        
                        const accounts = rows.slice(startIndex).map((row, index) => ({
                            id: index + 1,
                            firstName: row[0] || `User${index + 1}`,
                            lastName: row[1] || `Test${index + 1}`,
                            email: row[2] || `user${index + 1}@example.com`,
                            password: row[3] || this.generatePassword(),
                            username: row[4] || this.generateUsername(row[0], row[1]),
                            platform: row[5] || 'general'
                        }));

                        console.log(`📋 Successfully loaded ${accounts.length} accounts`);
                        return accounts;
                    }
                } catch (rangeError) {
                    console.log(`⚠️ Range ${range} not available: ${rangeError.message}`);
                    continue;
                }
            }
            
            // إذا لم نجد بيانات في أي نطاق
            console.log('⚠️ No accounts found in any sheet range, using sample data');
            return this.generateSampleAccounts();
            
        } catch (error) {
            console.error('❌ Error reading from Google Sheets:', error.message);
            console.log('📋 Using sample accounts instead');
            return this.generateSampleAccounts();
        }
    }

    generateSampleAccounts() {
        const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com'];
        const firstNames = ['Ali', 'Mohammed', 'Fatima', 'Aisha', 'Omar', 'Khadija'];
        const lastNames = ['Al-Mutairi', 'Al-Ghamdi', 'Al-Otaibi', 'Al-Harbi', 'Al-Zahrani'];
        
        const accounts = Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
            lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
            email: `user${i + 1}@${domains[Math.floor(Math.random() * domains.length)]}`,
            password: this.generatePassword(),
            username: `user${i + 1}_${Math.floor(Math.random() * 1000)}`,
            platform: 'general'
        }));
        
        console.log(`📋 Generated ${accounts.length} sample accounts`);
        return accounts;
    }

    generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        return Array.from(crypto.randomBytes(length))
            .map(b => chars[b % chars.length])
            .join('');
    }

    generateUsername(firstName, lastName) {
        const base = (firstName?.[0] || '') + (lastName || 'user');
        const randomNum = Math.floor(Math.random() * 1000);
        return `${base.toLowerCase()}${randomNum}`;
    }

    async initBrowser() {
        // إصلاح: استخدم استراتيجية افتراضية إذا لم تكن موجودة
        const strategy = this.knowledge.strategies[this.config.mode] || 
                        this.knowledge.strategies.intelligent ||
                        { delay: { min: 1500, max: 4000 }, retries: 3, headless: false };
        
        console.log(`🚀 Initializing browser in ${this.config.mode} mode`);
        console.log(`⚙️ Strategy: ${JSON.stringify(strategy)}`);
        
        this.browser = await chromium.launch({
            headless: strategy.headless || true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        // إنشاء context مع إعدادات بشرية
        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: this.knowledge.userAgents?.[
                Math.floor(Math.random() * this.knowledge.userAgents.length)
            ] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            locale: 'en-US',
            timezoneId: 'America/New_York',
            ignoreHTTPSErrors: true
        });

        // إضافة تدابير التخفي
        await this.context.addInitScript(() => {
            // إخفاء WebDriver
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            
            // تغيير languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        });

        console.log('✅ Browser initialized successfully');
    }

    async humanDelay(min = 1000, max = 3000) {
        const humanDelays = process.env.HUMAN_DELAYS !== 'false';
        if (!humanDelays) return;
        
        const delay = Math.floor(Math.random() * (max - min)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async simulateRegistration(platform, account) {
        const startTime = Date.now();
        
        console.log(`\n🔵 Simulating registration on ${platform} for ${account.email}`);
        
        try {
            const page = await this.context.newPage();
            
            // محاكاة تصفح صفحة المنصة
            await page.goto('about:blank');
            await this.humanDelay(1000, 3000);
            
            // محاكاة ملء النموذج
            const success = Math.random() > 0.4; // 60% success rate
            
            await page.close();
            
            const result = {
                platform,
                account: account.email,
                username: account.username,
                status: success ? 'SUCCESS' : 'FAILED',
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                message: success ? 'Account created successfully (simulated)' : 'Registration failed (simulated)'
            };
            
            console.log(`${success ? '✅' : '❌'} ${platform}: ${result.message}`);
            return result;
            
        } catch (error) {
            console.error(`❌ Error simulating registration on ${platform}:`, error.message);
            
            return {
                platform,
                account: account.email,
                username: account.username,
                status: 'FAILED',
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                message: `Simulation error: ${error.message}`
            };
        }
    }

    async saveResultsToSheet(results) {
        try {
            const sheetId = process.env.GOOGLE_SHEET_ID;
            
            // إنشاء صفحة جديدة للنتائج إذا لزم الأمر
            const range = 'Results!A:G';
            
            const values = results.map(result => [
                new Date().toISOString(),
                result.platform,
                result.account,
                result.username,
                result.status,
                result.message,
                result.duration
            ]);
            
            // إضافة عناوين الأعمدة
            const header = [['Timestamp', 'Platform', 'Email', 'Username', 'Status', 'Message', 'Duration (ms)']];
            
            await this.sheetsClient.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: { values: header.concat(values) }
            });
            
            console.log(`📊 Saved ${results.length} results to Google Sheets`);
            return true;
        } catch (error) {
            console.error('❌ Error saving to Google Sheets:', error.message);
            console.log('📝 Results will be saved locally only');
            return false;
        }
    }

    async saveResultsToFile(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(this.resultsDir, `report-${timestamp}.json`);
        
        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                runId: this.config.runId,
                mode: this.config.mode,
                batchSize: this.config.batchSize,
                learningEnabled: this.config.learningEnabled
            },
            results: results,
            summary: {
                totalRequested: results.length,
                totalCreated: results.filter(r => r.status === 'SUCCESS').length,
                totalFailed: results.filter(r => r.status === 'FAILED').length,
                successRate: results.length > 0 ? 
                    Math.round((results.filter(r => r.status === 'SUCCESS').length / results.length) * 100) : 0,
                averageDuration: results.length > 0 ? 
                    Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length) : 0
            }
        };
        
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`💾 Results saved to: ${reportFile}`);
        
        return reportFile;
    }

    updateKnowledge(results) {
        const learningEnabled = process.env.AI_LEARNING_ENABLED === 'true' || 
                               this.config.learningEnabled === true || 
                               this.config.learningEnabled === 'true';
        
        if (!learningEnabled) {
            console.log('🧠 AI learning is disabled for this run');
            return;
        }
        
        console.log('🧠 Updating AI knowledge...');
        
        // تحديث إحصائيات المنصات
        results.forEach(result => {
            if (!this.knowledge.platforms[result.platform]) {
                this.knowledge.platforms[result.platform] = {
                    attempts: 0,
                    successes: 0,
                    failures: 0
                };
            }
            
            const platform = this.knowledge.platforms[result.platform];
            platform.attempts++;
            
            if (result.status === 'SUCCESS') {
                platform.successes++;
            } else {
                platform.failures++;
            }
        });
        
        // تحديث الإحصائيات العامة
        this.knowledge.statistics.totalRuns++;
        this.knowledge.statistics.totalAccountsCreated += results.filter(r => r.status === 'SUCCESS').length;
        this.knowledge.statistics.lastRun = new Date().toISOString();
        
        // حفظ المعرفة المحدثة
        const knowledgePath = path.join(__dirname, '..', 'knowledge.json');
        fs.writeFileSync(knowledgePath, JSON.stringify(this.knowledge, null, 2));
        
        console.log('💾 AI knowledge updated and saved');
    }

    async run() {
        console.log('🚀 ========================================');
        console.log('🚀 WAHAB AI Registration System v2.0');
        console.log('🚀 ========================================');
        console.log(`📅 Started at: ${new Date().toISOString()}`);
        console.log(`⚙️ Mode: ${this.config.mode}`);
        console.log(`📦 Batch size: ${this.config.batchSize}`);
        console.log(`🧠 Learning: ${this.config.learningEnabled}`);
        console.log('=========================================\n');
        
        let success = false;
        
        try {
            // الخطوة 1: تهيئة Google Sheets
            console.log('📊 Initializing Google Sheets connection...');
            const sheetsReady = await this.initGoogleSheets();
            
            // الخطوة 2: جلب الحسابات
            console.log('📋 Loading accounts...');
            const accounts = await this.getAccountsFromSheet();
            
            // الخطوة 3: تهيئة المتصفح
            console.log('🌐 Initializing browser...');
            await this.initBrowser();
            
            // الخطوة 4: تحديد المنصات المستهدفة
            const platforms = ['Twitter', 'Instagram', 'Facebook', 'LinkedIn', 'Github'];
            console.log(`🎯 Target platforms: ${platforms.join(', ')}`);
            
            // الخطوة 5: تنفيذ التسجيل المحاكى
            console.log('\n🔧 Starting registration process...');
            
            for (let i = 0; i < Math.min(this.config.batchSize, accounts.length); i++) {
                const account = accounts[i];
                const platform = platforms[i % platforms.length];
                
                const result = await this.simulateRegistration(platform, account);
                this.results.push(result);
                
                // تأخير بين المحاولات
                await this.humanDelay(2000, 4000);
                
                if (this.results.length >= this.config.batchSize) break;
            }
            
            // الخطوة 6: حفظ النتائج
            if (sheetsReady && this.results.length > 0) {
                console.log('📊 Saving results to Google Sheets...');
                await this.saveResultsToSheet(this.results);
            }
            
            // حفظ النتائج محلياً
            console.log('💾 Saving results locally...');
            await this.saveResultsToFile(this.results);
            
            // الخطوة 7: تحديث معرفة الذكاء الاصطناعي
            console.log('🧠 Updating AI knowledge...');
            this.updateKnowledge(this.results);
            
            // الخطوة 8: عرض النتائج
            this.displaySummary();
            
            success = true;
            
        } catch (error) {
            console.error('❌ Critical error in AI system:', error);
            this.saveErrorLog(error);
        } finally {
            // تنظيف الموارد
            if (this.context) await this.context.close();
            if (this.browser) await this.browser.close();
            
            console.log('\n=========================================');
            console.log(success ? '🎉 Process completed successfully!' : '❌ Process completed with errors');
            console.log('=========================================');
            
            // إنهاء العملية بنجاح أو فشل
            process.exit(success ? 0 : 1);
        }
    }

    displaySummary() {
        console.log('\n📊 ============ RESULTS SUMMARY ============');
        
        const summary = {
            totalRequested: this.results.length,
            totalCreated: this.results.filter(r => r.status === 'SUCCESS').length,
            totalFailed: this.results.filter(r => r.status === 'FAILED').length,
            successRate: this.results.length > 0 ? 
                Math.round((this.results.filter(r => r.status === 'SUCCESS').length / this.results.length) * 100) : 0
        };
        
        console.log(`   Platforms processed: ${summary.totalRequested}`);
        console.log(`   Accounts created: ${summary.totalCreated}`);
        console.log(`   Accounts failed: ${summary.totalFailed}`);
        console.log(`   Success rate: ${summary.successRate}%`);
        
        console.log('=========================================\n');
    }

    saveErrorLog(error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            runId: this.config.runId,
            error: {
                message: error.message,
                stack: error.stack,
                config: this.config
            },
            results: this.results
        };
        
        const errorPath = path.join(this.logsDir, `error-${Date.now()}.json`);
        fs.writeFileSync(errorPath, JSON.stringify(errorLog, null, 2));
        console.log(`📝 Error log saved to: ${errorPath}`);
    }
}

// نقطة الدخول الرئيسية
async function main() {
    // قراءة الإعدادات من config.json
    const configPath = path.join(__dirname, '..', 'config.json');
    let config = {
        mode: 'intelligent',
        batchSize: 3,
        learningEnabled: true,
        enableScreenshots: false,
        targetPlatforms: '',
        runId: Date.now().toString()
    };
    
    if (fs.existsSync(configPath)) {
        try {
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (fileConfig.aiSystem) {
                config = { ...config, ...fileConfig.aiSystem };
            }
        } catch (error) {
            console.error('Error reading config:', error);
        }
    }
    
    console.log('⚙️ Loaded configuration:', config);
    
    // إنشاء وتشغيل النظام
    const aiSystem = new WahabAISystem(config);
    await aiSystem.run();
}

// تشغيل النظام
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = WahabAISystem;
