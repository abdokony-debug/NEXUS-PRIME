class GameeRegistration {
    constructor() {
        this.name = 'gamee';
        this.baseUrl = 'https://prizes.gamee.com';
        this.registrationUrl = 'https://prizes.gamee.com/signup';
    }

    async register(page, userData) {
        console.log('🎮 بدء التسجيل في Gamee...');
        
        // الذهاب إلى صفحة التسجيل
        await page.goto(this.registrationUrl, { waitUntil: 'networkidle' });
        
        // انتظار تحميل الصفحة
        await page.waitForSelector('form', { timeout: 10000 });
        
        // ملء حقول التسجيل
        await this.fillRegistrationForm(page, userData);
        
        // النقر على زر التسجيل
        await page.click('button[type="submit"]');
        
        // انتظار النتيجة
        await page.waitForTimeout(5000);
        
        // التحقق من النجاح
        const success = await this.verifySuccess(page);
        
        return {
            success,
            platform: 'gamee',
            email: userData.email,
            requiresEmailVerification: true,
            message: success ? 'تم التسجيل بنجاح في Gamee' : 'فشل التسجيل في Gamee'
        };
    }

    async fillRegistrationForm(page, userData) {
        // خريطة حقول Gamee
        const fieldMap = {
            email: ['input[name="email"]', 'input[type="email"]', '#email'],
            password: ['input[name="password"]', 'input[type="password"]', '#password'],
            username: ['input[name="username"]', '#username'],
            acceptTerms: ['input[name="terms"]', 'input[type="checkbox"]']
        };

        // ملء البريد الإلكتروني
        for (const selector of fieldMap.email) {
            const element = await page.$(selector);
            if (element) {
                await element.fill(userData.email);
                break;
            }
        }

        // ملء كلمة المرور
        for (const selector of fieldMap.password) {
            const element = await page.$(selector);
            if (element) {
                await element.fill(userData.password);
                break;
            }
        }

        // ملء اسم المستخدم
        for (const selector of fieldMap.username) {
            const element = await page.$(selector);
            if (element) {
                await element.fill(userData.username);
                break;
            }
        }

        // الموافقة على الشروط
        for (const selector of fieldMap.acceptTerms) {
            const element = await page.$(selector);
            if (element) {
                await element.click();
                break;
            }
        }
    }

    async verifySuccess(page) {
        const successIndicators = [
            'Welcome',
            'Dashboard',
            'Profile',
            'Account created',
            'Verification email sent'
        ];

        const content = await page.content();
        const currentUrl = page.url();

        for (const indicator of successIndicators) {
            if (content.includes(indicator) || currentUrl.includes('dashboard')) {
                return true;
            }
        }

        return false;
    }

    async handleEmailVerification(email) {
        // معالجة تحقق البريد الإلكتروني الخاص بـ Gamee
        console.log('📧 معالجة تحقق البريد الإلكتروني لـ Gamee...');
        
        // هنا يمكن إضافة منطق خاص لتحقق Gamee
        return true;
    }
}

module.exports = new GameeRegistration();
