class AIEngine {
    constructor() {
        this.strategies = [];
        this.learnedPatterns = {};
        this.successRate = {};
    }

    async train() {
        // تحميل البيانات التاريخية للتعلم
        console.log('🧠 تدريب المحرك الذكي...');
        // يمكن تحميل بيانات من ملفات أو قاعدة بيانات
    }

    async analyzePage(page) {
        const analysis = {
            hasForm: false,
            formType: null,
            fields: [],
            captchaPresent: false,
            emailVerificationRequired: false,
            complexity: 'low'
        };

        // تحليل محتوى الصفحة
        const content = await page.content();
        const url = page.url();

        // البحث عن نماذج التسجيل
        analysis.hasForm = await this.detectRegistrationForm(page);
        
        if (analysis.hasForm) {
            analysis.formType = await this.detectFormType(page);
            analysis.fields = await this.extractFormFields(page);
            analysis.captchaPresent = await this.detectCaptcha(page);
            analysis.emailVerificationRequired = await this.detectEmailVerification(page);
            analysis.complexity = this.calculateComplexity(analysis);
        }

        return analysis;
    }

    async detectRegistrationForm(page) {
        const selectors = [
            'form[action*="register"]',
            'form[action*="signup"]',
            'form[action*="create"]',
            'form:has(input[type="email"])',
            'form:has(input[type="password"])',
            '//form[.//*[contains(text(), "Sign Up")]]',
            '//form[.//*[contains(text(), "Register")]]'
        ];

        for (const selector of selectors) {
            const element = await page.$(selector);
            if (element) return true;
        }

        return false;
    }

    async detectFormType(page) {
        const fieldCount = await page.$$eval('input, select, textarea', elements => elements.length);
        
        if (fieldCount > 8) return 'extended';
        if (fieldCount > 4) return 'standard';
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
            '//*[contains(text(), "captcha")]'
        ];

        for (const selector of captchaIndicators) {
            const element = await page.$(selector);
            if (element) return true;
        }

        return false;
    }

    async detectEmailVerification(page) {
        const indicators = [
            'verify your email',
            'confirmation email',
            'check your inbox',
            'email verification',
            'confirm your email'
        ];

        const content = await page.content().toLowerCase();
        return indicators.some(indicator => content.includes(indicator));
    }

    calculateComplexity(analysis) {
        let score = 0;
        if (analysis.captchaPresent) score += 3;
        if (analysis.emailVerificationRequired) score += 2;
        if (analysis.formType === 'extended') score += 2;
        if (analysis.fields.length > 6) score += 1;

        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    selectStrategy(analysis) {
        const strategies = {
            simple: this.simpleStrategy,
            standard: this.standardStrategy,
            extended: this.extendedStrategy,
            captcha: this.captchaStrategy,
            email_verify: this.emailVerificationStrategy
        };

        let selectedStrategy = strategies.standard;

        if (analysis.complexity === 'high') selectedStrategy = strategies.extended;
        if (analysis.captchaPresent) selectedStrategy = strategies.captcha;
        if (analysis.emailVerificationRequired) selectedStrategy = strategies.email_verify;

        return selectedStrategy;
    }

    async executeStrategy(page, userData, strategy) {
        return await strategy(page, userData);
    }

    // استراتيجيات التسجيل المختلفة
    async simpleStrategy(page, userData) {
        // تسجيل بسيط - نموذج أساسي
        await this.fillField(page, 'email', userData.email);
        await this.fillField(page, 'password', userData.password);
        await this.clickSubmit(page);
        
        return { success: true, requiresEmailVerification: false };
    }

    async standardStrategy(page, userData) {
        // تسجيل قياسي - مع حقول إضافية
        const fields = [
            { selector: 'email', value: userData.email },
            { selector: 'password', value: userData.password },
            { selector: 'username', value: userData.username },
            { selector: 'first_name', value: userData.firstName },
            { selector: 'last_name', value: userData.lastName }
        ];

        for (const field of fields) {
            await this.fillField(page, field.selector, field.value);
        }

        await this.clickSubmit(page);
        return { success: true, requiresEmailVerification: true };
    }

    async captchaStrategy(page, userData) {
        // تسجيل مع CAPTCHA
        await this.fillField(page, 'email', userData.email);
        await this.fillField(page, 'password', userData.password);
        
        // حل CAPTCHA
        const captchaSolution = await this.solveCaptcha(page);
        if (captchaSolution) {
            await page.evaluate((solution) => {
                // إدخال حل CAPTCHA
                document.querySelector('#g-recaptcha-response').value = solution;
            }, captchaSolution);
        }

        await this.clickSubmit(page);
        return { success: true, requiresEmailVerification: false };
    }

    async emailVerificationStrategy(page, userData) {
        // تسجيل مع تحقق بريد إلكتروني
        const result = await this.standardStrategy(page, userData);
        result.requiresEmailVerification = true;
        return result;
    }

    async fillField(page, fieldType, value) {
        const selectors = {
            email: ['input[type="email"]', 'input[name="email"]', '#email'],
            password: ['input[type="password"]', 'input[name="password"]', '#password'],
            username: ['input[name="username"]', '#username', 'input[placeholder*="username"]'],
            first_name: ['input[name="first_name"]', '#first_name', 'input[placeholder*="first name"]'],
            last_name: ['input[name="last_name"]', '#last_name', 'input[placeholder*="last name"]']
        };

        const fieldSelectors = selectors[fieldType] || [fieldType];

        for (const selector of fieldSelectors) {
            const element = await page.$(selector);
            if (element) {
                await element.fill(value);
                await page.waitForTimeout(100); // تأخير طبيعي مثل الكتابة البشرية
                return true;
            }
        }

        return false;
    }

    async clickSubmit(page) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Sign Up")',
            'button:has-text("Register")',
            'button:has-text("Create Account")'
        ];

        for (const selector of submitSelectors) {
            const element = await page.$(selector);
            if (element) {
                await element.click();
                await page.waitForTimeout(2000); // انتظار تحميل الصفحة التالية
                return true;
            }
        }

        return false;
    }

    async solveCaptcha(page) {
        // استخدام خدمة حل CAPTCHA (مثل 2Captcha، Anti-Captcha)
        const apiKey = process.env.CAPTCHA_API_KEY;
        if (!apiKey) return null;

        // الكشف عن نوع CAPTCHA
        const captchaType = await this.detectCaptchaType(page);
        
        // إرسال CAPTCHA للحل
        const solution = await this.sendToCaptchaService(captchaType, page);
        return solution;
    }

    async learnFromResult(result) {
        // تحديث قاعدة المعرفة بناءً على النتائج
        const platform = result.platform;
        
        if (!this.successRate[platform]) {
            this.successRate[platform] = { success: 0, total: 0 };
        }

        this.successRate[platform].total++;
        if (result.success) {
            this.successRate[platform].success++;
        }

        // حفظ الأنماط الناجحة
        if (result.success && result.strategy) {
            this.learnedPatterns[platform] = {
                strategy: result.strategy,
                fields: result.fieldsUsed,
                timestamp: new Date()
            };
        }
    }

    detectHandler(url) {
        // الكشف التلقائي عن المنصة من الرابط
        const urlPatterns = {
            'gamee.com': 'gamee',
            'freecash.com': 'freecash',
            'pawns.app': 'pawns',
            'extrabux.com': 'extrabux',
            'swagbucks.com': 'swagbucks'
        };

        for (const [pattern, handler] of Object.entries(urlPatterns)) {
            if (url.includes(pattern)) {
                return require(`../platforms/${handler}`);
            }
        }

        return null;
    }
}

module.exports = AIEngine;
