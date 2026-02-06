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
            const range = 'Accounts!A:F'; // تعديل حسب هيكل شيتك
            
            const response = await this.sheetsClient.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: range
            });

            const rows = response.data.values;
            if (!rows || rows.length < 2) {
                console.log('⚠️ No accounts found in sheet, using sample data');
                return this.generateSampleAccounts();
            }

            // تحويل الصفوف إلى كائنات حساب
            const accounts = rows.slice(1).map((row, index) => ({
                id: index + 1,
                firstName: row[0] || `User${index + 1}`,
                lastName: row[1] || `Test${index + 1}`,
                email: row[2] || `user${index + 1}@example.com`,
                password: row[3] || this.generatePassword(),
                username: row[4] || this.generateUsername(row[0], row[1]),
                platform: row[5] || 'general'
            }));

            console.log(`📋 Loaded ${accounts.length} accounts from Google Sheets`);
            return accounts;
        } catch (error) {
            console.error('❌ Error reading from Google Sheets:', error.message);
            return this.generateSampleAccounts();
        }
    }

    generateSampleAccounts() {
        const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com'];
        const firstNames = ['Ali', 'Mohammed', 'Fatima', 'Aisha', 'Omar', 'Khadija'];
        const lastNames = ['Al-Mutairi', 'Al-Ghamdi', 'Al-Otaibi', 'Al-Harbi', 'Al-Zahrani'];
        
        return Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
            lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
            email: `user${i + 1}@${domains[Math.floor(Math.random() * domains.length)]}`,
            password: this.generatePassword(),
            username: `user${i + 1}_${Math.floor(Math.random() * 1000)}`,
            platform: 'general'
        }));
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
        const strategy = this.knowledge.strategies[this.config.mode] || this.knowledge.strategies.intelligent;
        
        console.log(`🚀 Initializing browser in ${this.config.mode} mode`);
        
        this.browser = await chromium.launch({
            headless: strategy.headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        // إنشاء context مع إعدادات بشرية
        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: this.knowledge.userAgents[
                Math.floor(Math.random() * this.knowledge.userAgents.length)
            ],
            locale: 'en-US',
            timezoneId: 'America/New_York',
            permissions: ['notifications'],
            ignoreHTTPSErrors: true
        });

        // إضافة تدابير التخفي
        await this.context.addInitScript(() => {
            // إخفاء WebDriver
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            
            // تغيير languages و plugins
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Overwrite the `plugins` property to use a custom getter.
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Overwrite the `languages` property to use a custom getter.
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // تغيير chrome
            window.chrome = {
                runtime: {},
                loadTimes: () => {},
                csi: () => {},
                app: {}
            };
        });

        console.log('✅ Browser initialized with human-like settings');
    }

    async humanDelay(min = 1000, max = 3000) {
        if (this.config.humanDelays === 'false') return;
        
        const delay = Math.floor(Math.random() * (max - min)) + min;
        const jitter = Math.random() * 0.3; // ±30% تباين
        
        await new Promise(resolve => 
            setTimeout(resolve, delay * (1 + jitter))
        );
    }

    async registerOnPlatform(platform, account) {
        const startTime = Date.now();
        const platformConfig = this.getPlatformConfig(platform);
        
        console.log(`\n🔵 Attempting registration on ${platform} for ${account.email}`);
        
        try {
            const page = await this.context.newPage();
            
            // التصفح إلى صفحة التسجيل
            await page.goto(platformConfig.registrationUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            
            await this.humanDelay(2000, 5000);
            
            // ملء النموذج بناءً على منصة
            await this.fillRegistrationForm(page, platform, account);
            
            await this.humanDelay(1000, 3000);
            
            // النقر على زر التسجيل
            await page.click(platformConfig.selectors.submitButton);
            
            await this.humanDelay(3000, 8000);
            
            // التحقق من النجاح
            const success = await this.verifyRegistration(page, platform);
            
            // التقاط لقطة شاشة
            if (this.config.enableScreenshots) {
                const screenshotName = `${platform}_${Date.now()}.png`;
                await page.screenshot({
                    path: path.join(this.screenshotsDir, screenshotName),
                    fullPage: true
                });
            }
            
            await page.close();
            
            const result = {
                platform,
                account: account.email,
                username: account.username,
                status: success ? 'SUCCESS' : 'FAILED',
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                message: success ? 'Account created successfully' : 'Registration failed'
            };
            
            console.log(`${success ? '✅' : '❌'} ${platform}: ${result.message}`);
            return result;
            
        } catch (error) {
            console.error(`❌ Error registering on ${platform}:`, error.message);
            
            return {
                platform,
                account: account.email,
                username: account.username,
                status: 'FAILED',
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                message: `Error: ${error.message}`
            };
        }
    }

    getPlatformConfig(platform) {
        const configs = {
            'Twitter': {
                registrationUrl: 'https://twitter.com/i/flow/signup',
                selectors: {
                    nameInput: 'input[name="name"]',
                    emailInput: 'input[name="email"]',
                    passwordInput: 'input[name="password"]',
                    submitButton: 'div[data-testid="submitButton"]'
                }
            },
            'Instagram': {
                registrationUrl: 'https://www.instagram.com/accounts/emailsignup/',
                selectors: {
                    emailInput: 'input[name="emailOrPhone"]',
                    nameInput: 'input[name="fullName"]',
                    usernameInput: 'input[name="username"]',
                    passwordInput: 'input[name="password"]',
                    submitButton: 'button[type="submit"]'
                }
            },
            'Facebook': {
                registrationUrl: 'https://www.facebook.com/r.php',
                selectors: {
                    firstNameInput: 'input[name="firstname"]',
                    lastNameInput: 'input[name="lastname"]',
                    emailInput: 'input[name="reg_email__"]',
                    passwordInput: 'input[name="reg_passwd__"]',
                    submitButton: 'button[name="websubmit"]'
                }
            },
            'LinkedIn': {
                registrationUrl: 'https://www.linkedin.com/signup',
                selectors: {
                    emailInput: 'input[name="email-address"]',
                    passwordInput: 'input[name="password"]',
                    firstNameInput: 'input[name="first-name"]',
                    lastNameInput: 'input[name="last-name"]',
                    submitButton: 'button[type="submit"]'
                }
            },
            'Github': {
                registrationUrl: 'https://github.com/signup',
                selectors: {
                    emailInput: 'input[name="user[email]"]',
                    passwordInput: 'input[name="user[password]"]',
                    usernameInput: 'input[name="user[login]"]',
                    submitButton: 'button[type="submit"]'
                }
            }
        };
        
        return configs[platform] || configs.Twitter;
    }

    async fillRegistrationForm(page, platform, account) {
        const config = this.getPlatformConfig(platform);
        
        for (const [field, selector] of Object.entries(config.selectors)) {
            if (field.includes('Input') && !field.includes('submit')) {
                try {
                    const inputType = field.toLowerCase();
                    let value = '';
                    
                    if (inputType.includes('email')) value = account.email;
                    else if (inputType.includes('password')) value = account.password;
                    else if (inputType.includes('firstname') || inputType.includes('name')) value = account.firstName;
                    else if (inputType.includes('lastname')) value = account.lastName;
                    else if (inputType.includes('username')) value = account.username;
                    else value = account[field] || '';
                    
                    if (value) {
                        await page.fill(selector, value);
                        await this.humanDelay(100, 500); // تأخير بين الكتابات
                    }
                } catch (error) {
                    console.log(`⚠️ Could not fill ${field} on ${platform}`);
                }
            }
        }
    }

    async verifyRegistration(page, platform) {
        try {
            // انتظر إما رسالة نجاح أو خطأ
            await Promise.race([
                page.waitForSelector('text/=success|welcome|verified|complete/i', { timeout: 10000 }),
                page.waitForSelector('text/=error|invalid|failed|try again/i', { timeout: 10000 })
            ]);
            
            // تحقق من URL الحالي
            const url = page.url();
            const successPatterns = [
                /dashboard/i,
                /home/i,
                /welcome/i,
                /complete/i,
                /verified/i
            ];
            
            const hasSuccess = successPatterns.some(pattern => pattern.test(url));
            return hasSuccess;
            
        } catch (error) {
            // إذا لم نجد أي من المؤشرات، نفترض الفشل
            return false;
        }
    }

    async saveResultsToSheet(results) {
        try {
            const sheetId = process.env.GOOGLE_SHEET_ID;
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
            
            // إضافة عناوين الأعمدة إذا كان الورقة فارغة
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
                successRate: Math.round(
                    (results.filter(r => r.status === 'SUCCESS').length / results.length) * 100
                ) || 0,
                averageDuration: Math.round(
                    results.reduce((sum, r) => sum + r.duration, 0) / results.length
                ) || 0
            },
            platformBreakdown: this.calculatePlatformStats(results)
        };
        
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`💾 Results saved to: ${reportFile}`);
        
        // حفظ ملخص بصيغة CSV
        this.saveCSVSummary(report);
        
        return reportFile;
    }

    calculatePlatformStats(results) {
        const stats = {};
        results.forEach(result => {
            if (!stats[result.platform]) {
                stats[result.platform] = {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    avgDuration: 0,
                    totalDuration: 0
                };
            }
            
            stats[result.platform].attempts++;
            if (result.status === 'SUCCESS') {
                stats[result.platform].successes++;
            } else {
                stats[result.platform].failures++;
            }
            stats[result.platform].totalDuration += result.duration;
        });
        
        // حساب المتوسطات
        Object.keys(stats).forEach(platform => {
            stats[platform].avgDuration = Math.round(
                stats[platform].totalDuration / stats[platform].attempts
            );
            stats[platform].successRate = Math.round(
                (stats[platform].successes / stats[platform].attempts) * 100
            );
        });
        
        return stats;
    }

    saveCSVSummary(report) {
        const csvPath = path.join(this.resultsDir, `summary-${Date.now()}.csv`);
        const headers = ['Platform', 'Attempts', 'Successes', 'Failures', 'Success Rate', 'Avg Duration (ms)'];
        
        let csvContent = headers.join(',') + '\n';
        
        Object.entries(report.platformBreakdown).forEach(([platform, stats]) => {
            const row = [
                platform,
                stats.attempts,
                stats.successes,
                stats.failures,
                `${stats.successRate}%`,
                stats.avgDuration
            ];
            csvContent += row.join(',') + '\n';
        });
        
        // إضافة الإجماليات
        csvContent += `\nTOTAL,${report.summary.totalRequested},${report.summary.totalCreated},${report.summary.totalFailed},${report.summary.successRate}%,${report.summary.averageDuration}`;
        
        fs.writeFileSync(csvPath, csvContent);
        console.log(`📈 CSV summary saved to: ${csvPath}`);
    }

    updateKnowledge(results) {
        if (this.config.learningEnabled !== 'true' && this.config.learningEnabled !== true) {
            return;
        }
        
        console.log('🧠 Updating AI knowledge...');
        
        // تحديث إحصائيات المنصات
        results.forEach(result => {
            if (!this.knowledge.platforms[result.platform]) {
                this.knowledge.platforms[result.platform] = {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    totalDuration: 0,
                    lastAttempt: null
                };
            }
            
            const platform = this.knowledge.platforms[result.platform];
            platform.attempts++;
            platform.lastAttempt = result.timestamp;
            platform.totalDuration += result.duration;
            
            if (result.status === 'SUCCESS') {
                platform.successes++;
                this.knowledge.successPatterns.push({
                    platform: result.platform,
                    timestamp: result.timestamp,
                    mode: this.config.mode,
                    duration: result.duration,
                    strategy: 'form_fill'
                });
            } else {
                platform.failures++;
                this.knowledge.failurePatterns.push({
                    platform: result.platform,
                    timestamp: result.timestamp,
                    mode: this.config.mode,
                    error: result.message,
                    strategy: 'form_fill'
                });
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
        
        // إنشاء تقرير التحليل
        this.generateKnowledgeAnalysis();
    }

    generateKnowledgeAnalysis() {
        const analysis = {
            generatedAt: new Date().toISOString(),
            totalPlatforms: Object.keys(this.knowledge.platforms).length,
            platformPerformance: {},
            recommendations: []
        };
        
        // تحليل أداء كل منصة
        Object.entries(this.knowledge.platforms).forEach(([platform, stats]) => {
            const successRate = Math.round((stats.successes / stats.attempts) * 100);
            analysis.platformPerformance[platform] = {
                successRate: `${successRate}%`,
                attempts: stats.attempts,
                avgDuration: Math.round(stats.totalDuration / stats.attempts)
            };
            
            // توليد توصيات
            if (successRate < 50) {
                analysis.recommendations.push({
                    platform,
                    issue: 'Low success rate',
                    suggestion: 'Try stealth mode with longer delays'
                });
            } else if (successRate > 80) {
                analysis.recommendations.push({
                    platform,
                    issue: 'High success rate',
                    suggestion: 'Can try fast mode for efficiency'
                });
            }
        });
        
        // حفظ تحليل المعرفة
        const analysisPath = path.join(this.resultsDir, `knowledge-analysis-${Date.now()}.json`);
        fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
        
        console.log('📊 Knowledge analysis generated');
    }

    async run() {
        console.log('🚀 ========================================');
        console.log('🚀 WAHAB AI Registration System v2.0');
        console.log('🚀 ========================================');
        console.log(`📅 Started at: ${new Date().toISOString()}`);
        console.log(`⚙️ Mode: ${this.config.mode}`);
        console.log(`📦 Batch size: ${this.config.batchSize}`);
        console.log(`🧠 Learning: ${this.config.learningEnabled}`);
        console.log(`📸 Screenshots: ${this.config.enableScreenshots}`);
        console.log('=========================================\n');
        
        let success = false;
        
        try {
            // الخطوة 1: تهيئة Google Sheets
            const sheetsReady = await this.initGoogleSheets();
            
            // الخطوة 2: جلب الحسابات
            const accounts = sheetsReady ? 
                await this.getAccountsFromSheet() : 
                this.generateSampleAccounts();
            
            // الخطوة 3: تهيئة المتصفح
            await this.initBrowser();
            
            // الخطوة 4: تحديد المنصات المستهدفة
            const platforms = this.getTargetPlatforms();
            
            // الخطوة 5: تنفيذ التسجيل
            for (let i = 0; i < Math.min(this.config.batchSize, accounts.length); i++) {
                const account = accounts[i];
                
                for (const platform of platforms) {
                    if (this.results.length >= this.config.batchSize) break;
                    
                    const result = await this.registerOnPlatform(platform, account);
                    this.results.push(result);
                    
                    // تأخير بين المحاولات
                    await this.humanDelay(2000, 6000);
                }
                
                if (this.results.length >= this.config.batchSize) break;
            }
            
            // الخطوة 6: حفظ النتائج
            if (sheetsReady && this.results.length > 0) {
                await this.saveResultsToSheet(this.results);
            }
            
            // حفظ النتائج محلياً
            const reportFile = await this.saveResultsToFile(this.results);
            
            // الخطوة 7: تحديث معرفة الذكاء الاصطناعي
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

    getTargetPlatforms() {
        const allPlatforms = ['Twitter', 'Instagram', 'Facebook', 'LinkedIn', 'Github'];
        
        // إذا تم تحديد منصات محددة
        if (this.config.targetPlatforms) {
            const targets = this.config.targetPlatforms.split(',').map(p => p.trim());
            return allPlatforms.filter(p => 
                targets.some(t => p.toLowerCase().includes(t.toLowerCase()))
            );
        }
        
        // إذا لم يتم تحديد، استخدم الجميع
        return allPlatforms;
    }

    displaySummary() {
        console.log('\n📊 ============ RESULTS SUMMARY ============');
        
        const summary = {
            totalRequested: this.results.length,
            totalCreated: this.results.filter(r => r.status === 'SUCCESS').length,
            totalFailed: this.results.filter(r => r.status === 'FAILED').length,
            successRate: Math.round(
                (this.results.filter(r => r.status === 'SUCCESS').length / this.results.length) * 100
            ) || 0
        };
        
        console.log(`   Platforms processed: ${summary.totalRequested}`);
        console.log(`   Accounts created: ${summary.totalCreated}`);
        console.log(`   Accounts failed: ${summary.totalFailed}`);
        console.log(`   Success rate: ${summary.successRate}%`);
        
        // تفصيل حسب المنصة
        console.log('\n📈 Platform Breakdown:');
        const platformStats = {};
        this.results.forEach(result => {
            if (!platformStats[result.platform]) {
                platformStats[result.platform] = { success: 0, failed: 0 };
            }
            
            if (result.status === 'SUCCESS') {
                platformStats[result.platform].success++;
            } else {
                platformStats[result.platform].failed++;
            }
        });
        
        Object.entries(platformStats).forEach(([platform, stats]) => {
            const total = stats.success + stats.failed;
            const rate = Math.round((stats.success / total) * 100);
            console.log(`   ${platform}: ${stats.success}/${total} (${rate}%)`);
        });
        
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
        runId: Date.now().toString(),
        humanDelays: 'true'
    };
    
    if (fs.existsSync(configPath)) {
        try {
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config = { ...config, ...fileConfig.aiSystem };
        } catch (error) {
            console.error('Error reading config:', error);
        }
    }
    
    // إضافة متغيرات البيئة
    config.humanDelays = process.env.HUMAN_DELAYS || 'true';
    
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
