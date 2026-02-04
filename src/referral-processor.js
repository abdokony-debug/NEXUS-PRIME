const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');

class ReferralProcessor {
  constructor() {
    this.referralSites = this.loadReferralSites();
    this.results = [];
  }

  loadReferralSites() {
    const sitesPath = path.join(__dirname, '../config/sites.json');
    
    if (fs.existsSync(sitesPath)) {
      return fs.readJsonSync(sitesPath);
    }
    
    // مواقع افتراضية للإحالات
    return {
      'academic.edu': {
        name: 'Academic Referral System',
        url: 'https://academic.edu/referral',
        selectors: {
          email: '#email',
          name: '#fullName',
          referralCode: '#referralCode',
          submit: 'button[type="submit"]',
          success: '.success-message',
          error: '.error-message'
        },
        steps: ['fill_email', 'fill_name', 'fill_referral', 'submit', 'verify'],
        requiredFields: ['email', 'name'],
        delayBetweenSteps: 2000
      },
      'university.com': {
        name: 'University Referral Portal',
        url: 'https://university.com/refer',
        selectors: {
          email: 'input[name="email"]',
          firstName: '#firstName',
          lastName: '#lastName',
          university: '#university',
          submit: 'button.submit-btn',
          success: '.alert-success',
          captcha: '.g-recaptcha'
        },
        steps: ['fill_personal', 'fill_university', 'solve_captcha', 'submit'],
        captchaRequired: true
      }
    };
  }

  async processReferrals(options) {
    const {
      identity,
      browser,
      count = 5,
      delay = 3000,
      sites = Object.keys(this.referralSites)
    } = options;

    const results = [];
    const selectedSites = this.selectRandomSites(sites, count);

    for (let i = 0; i < selectedSites.length; i++) {
      const siteKey = selectedSites[i];
      const siteConfig = this.referralSites[siteKey];
      
      console.log(`Processing referral ${i + 1}/${count} on ${siteConfig.name}`);
      
      try {
        const result = await this.processSingleReferral({
          identity,
          browser,
          siteConfig,
          siteKey
        });
        
        results.push(result);
        
        // تأخير بين الإحالات
        if (i < selectedSites.length - 1) {
          await this.randomDelay(delay, delay * 2);
        }
        
      } catch (error) {
        console.error(`Failed to process referral on ${siteConfig.name}:`, error);
        results.push({
          site: siteConfig.name,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  selectRandomSites(availableSites, count) {
    const shuffled = [...availableSites].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async processSingleReferral({ identity, browser, siteConfig, siteKey }) {
    const page = await browser.context.newPage();
    const startTime = Date.now();
    
    try {
      // تنفيذ خطوات الموقع
      const stepsResult = await this.executeSiteSteps(page, siteConfig, identity);
      
      // التحقق من النجاح
      const success = await this.verifySuccess(page, siteConfig);
      
      // التقاط لقطات
      const screenshot = await browser.takeScreenshot(page, `referral_${siteKey}`);
      
      // جمع البيانات
      const pageData = await browser.getPageMetrics(page);
      
      const result = {
        site: siteConfig.name,
        url: siteConfig.url,
        identityId: identity.id,
        success,
        steps: stepsResult,
        duration: Date.now() - startTime,
        screenshot: screenshot.filename,
        pageData,
        timestamp: new Date().toISOString()
      };
      
      // حفظ النتيجة
      await this.saveResult(result);
      
      return result;
      
    } finally {
      await page.close();
    }
  }

  async executeSiteSteps(page, siteConfig, identity) {
    const steps = siteConfig.steps || ['navigate', 'fill_form', 'submit'];
    const results = [];
    
    // الانتقال إلى رابط الإحالة
    await page.goto(siteConfig.url, { waitUntil: 'networkidle' });
    results.push({ step: 'navigate', success: true });
    
    // تنفيذ كل خطوة
    for (const step of steps) {
      try {
        const stepResult = await this.executeStep(step, page, siteConfig, identity);
        results.push({ step, ...stepResult });
        
        // تأخير بين الخطوات
        await this.randomDelay(
          siteConfig.delayBetweenSteps || 1000,
          (siteConfig.delayBetweenSteps || 1000) * 2
        );
        
      } catch (error) {
        results.push({
          step,
          success: false,
          error: error.message
        });
        throw error;
      }
    }
    
    return results;
  }

  async executeStep(step, page, siteConfig, identity) {
    const selectors = siteConfig.selectors || {};
    
    switch (step) {
      case 'fill_email':
        await browser.humanType(page, selectors.email, identity.contact.email);
        return { success: true };
        
      case 'fill_name':
        const fullName = `${identity.personal.firstName} ${identity.personal.lastName}`;
        await browser.humanType(page, selectors.name || selectors.fullName, fullName);
        return { success: true };
        
      case 'fill_personal':
        await browser.humanType(page, selectors.firstName, identity.personal.firstName);
        await this.randomDelay(500, 1500);
        await browser.humanType(page, selectors.lastName, identity.personal.lastName);
        return { success: true };
        
      case 'fill_university':
        if (identity.academic && selectors.university) {
          await browser.humanType(page, selectors.university, identity.academic.university);
        }
        return { success: true };
        
      case 'fill_referral':
        if (selectors.referralCode) {
          const referralCode = this.generateReferralCode();
          await browser.humanType(page, selectors.referralCode, referralCode);
        }
        return { success: true };
        
      case 'solve_captcha':
        if (siteConfig.captchaRequired) {
          await this.solveCaptcha(page, selectors.captcha);
        }
        return { success: true };
        
      case 'submit':
        await browser.humanClick(page, selectors.submit);
        return { success: true };
        
      case 'verify':
        // انتظار التحقق
        await page.waitForTimeout(3000);
        return { success: true };
        
      default:
        return { success: true, skipped: true };
    }
  }

  async solveCaptcha(page, captchaSelector) {
    // محاولة حل الكابتشا تلقائياً
    try {
      // إذا كان reCAPTCHA
      if (await page.$(captchaSelector)) {
        await page.waitForTimeout(5000); // وقت للتحقق البشري (إن وجد)
        
        // محاولة النقر على المربع
        await page.click(captchaSelector);
        await page.waitForTimeout(2000);
        
        // التحقق من النجاح
        const isSolved = await page.evaluate(() => {
          const iframe = document.querySelector('iframe[src*="recaptcha"]');
          return iframe ? iframe.getAttribute('aria-checked') === 'true' : false;
        });
        
        if (!isSolved) {
          throw new Error('CAPTCHA not solved automatically');
        }
      }
    } catch (error) {
      console.warn('CAPTCHA solving failed:', error.message);
      throw error;
    }
  }

  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async verifySuccess(page, siteConfig) {
    const successSelectors = siteConfig.selectors?.success || ['.success', '.alert-success', 'div:contains("Thank you")'];
    
    for (const selector of Array.isArray(successSelectors) ? successSelectors : [successSelectors]) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    // التحقق من عنوان URL
    const currentUrl = page.url();
    const successPatterns = ['thank', 'success', 'confirmed', 'completed'];
    
    for (const pattern of successPatterns) {
      if (currentUrl.toLowerCase().includes(pattern)) {
        return true;
      }
    }
    
    return false;
  }

  async saveResult(result) {
    const resultsPath = path.join(__dirname, '../databases/referral_results.json');
    
    let allResults = [];
    if (fs.existsSync(resultsPath)) {
      allResults = await fs.readJson(resultsPath);
    }
    
    allResults.push(result);
    
    await fs.writeJson(resultsPath, allResults, { spaces: 2 });
    
    // تحديث قاعدة البيانات الرئيسية
    await this.updateDatabase(result);
  }

  async updateDatabase(result) {
    const dbPath = path.join(__dirname, '../databases/results.db');
    // هنا يمكن إضافة كود SQLite للتحديث
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getStats() {
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    
    return {
      totalReferrals: total,
      successfulReferrals: successful,
      failedReferrals: total - successful,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%'
    };
  }
}

module.exports = ReferralProcessor;
