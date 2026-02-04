const { chromium } = require('playwright');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { inject: injectFingerprint } = require('fingerprint-injector');
const userAgent = require('user-agents');
const fs = require('fs-extra');
const path = require('path');

puppeteer.use(StealthPlugin());

class BrowserSimulator {
  constructor() {
    this.config = {
      viewports: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
      ],
      humanLikeDelays: {
        min: 100,
        max: 3000,
        typing: { min: 50, max: 150 }
      }
    };
  }

  async launch(options = {}) {
    const {
      proxy = null,
      fingerprint = null,
      stealthLevel = 'high',
      headless = true
    } = options;

    // تحديد مستوى التمويه
    const launchOptions = this.getLaunchOptions(stealthLevel, proxy);
    launchOptions.headless = headless;

    // إضافة إعدادات إضافية للتمويه
    Object.assign(launchOptions, {
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        ...launchOptions.args,
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--disable-accelerated-mjpeg-decode',
        '--disable-app-list-dismiss-on-blur',
        '--disable-accelerated-video-decode',
        '--disable-webgl',
        '--disable-webgl2',
        '--disable-3d-apis',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-domain-reliability',
        '--disable-sync',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-background-networking',
        '--metrics-recording-only',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
        '--disable-infobars'
      ]
    });

    // تشغيل المتصفح
    const browser = await chromium.launch(launchOptions);
    
    // إنشاء سياق مع بصمة فريدة
    const context = await this.createContext(browser, fingerprint, proxy);
    const page = await context.newPage();

    // تطبيق سلوك بشري
    await this.applyHumanBehavior(page);

    return {
      browser,
      context,
      page,
      fingerprint: fingerprint || this.generateFingerprint()
    };
  }

  getLaunchOptions(stealthLevel, proxy) {
    const baseOptions = {
      headless: true,
      timeout: 60000
    };

    switch (stealthLevel) {
      case 'high':
        return {
          ...baseOptions,
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
          ],
          ...(proxy && { proxy: { server: proxy.server } })
        };

      case 'medium':
        return {
          ...baseOptions,
          args: ['--disable-blink-features=AutomationControlled'],
          ...(proxy && { proxy: { server: proxy.server } })
        };

      default:
        return {
          ...baseOptions,
          ...(proxy && { proxy: { server: proxy.server } })
        };
    }
  }

  async createContext(browser, fingerprint, proxy) {
    const viewport = this.config.viewports[
      Math.floor(Math.random() * this.config.viewports.length)
    ];

    // إنشاء User-Agent عشوائي
    const ua = new userAgent({ deviceCategory: 'desktop' });
    
    const context = await browser.newContext({
      viewport,
      userAgent: ua.toString(),
      locale: fingerprint?.locale || 'en-US',
      timezoneId: fingerprint?.timezone || 'America/New_York',
      permissions: ['geolocation'],
      geolocation: { latitude: 40.7128, longitude: -74.0060 }, // نيويورك
      ...(proxy && { proxy: { server: proxy.server } })
    });

    // حقن بصمة المتصفح
    if (fingerprint) {
      await injectFingerprint(context, fingerprint);
    }

    // إضافة ملفات تعريفية عشوائية
    await this.addRandomCookies(context);
    
    return context;
  }

  generateFingerprint() {
    return {
      userAgent: new userAgent({ deviceCategory: 'desktop' }).toString(),
      platform: 'Win32',
      languages: ['en-US', 'en'],
      screen: {
        width: 1920,
        height: 1080,
        colorDepth: 24,
        pixelDepth: 24
      },
      hardwareConcurrency: navigator.hardwareConcurrency || 8,
      deviceMemory: navigator.deviceMemory || 8,
      timezone: 'America/New_York',
      webglVendor: 'Google Inc. (NVIDIA)',
      webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)'
    };
  }

  async addRandomCookies(context) {
    const commonSites = [
      'https://www.google.com',
      'https://www.facebook.com',
      'https://www.youtube.com',
      'https://www.amazon.com',
      'https://www.reddit.com'
    ];

    for (const site of commonSites) {
      if (Math.random() > 0.5) {
        await context.addCookies([{
          name: `session_${Math.random().toString(36).substring(7)}`,
          value: Math.random().toString(36).substring(2),
          domain: new URL(site).hostname,
          path: '/',
          expires: Date.now() + 86400000, // يوم واحد
          httpOnly: true,
          secure: true,
          sameSite: 'Lax'
        }]);
      }
    }
  }

  async applyHumanBehavior(page) {
    // محاكاة حركات الماوس العشوائية
    await page.evaluateOnNewDocument(() => {
      // إخفاء WebDriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // إخفاء Chrome
      window.chrome = { runtime: {} };
      
      // تعديل permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // إضافة مستخدمين افتراضيين للواتساب
      if ('Notification' in window) {
        Notification.requestPermission();
      }

      // محاكاة حركة الماوس
      document.addEventListener('mousemove', (e) => {
        window.lastMouseMove = {
          x: e.clientX,
          y: e.clientY,
          time: Date.now()
        };
      });

      // تسجيل سلوك التمرير
      let lastScroll = 0;
      window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (Math.abs(currentScroll - lastScroll) > 50) {
          lastScroll = currentScroll;
          window.lastScrollTime = Date.now();
        }
      });

      // إضافة متغيرات متصفح عشوائية
      window.randomBrowserVar = Math.random().toString(36).substring(7);
    });

    // إضافة تأخيرات عشوائية بين الإجراءات
    page.on('load', () => this.randomDelay());
  }

  async humanType(page, selector, text) {
    const element = await page.$(selector);
    if (!element) return;

    // محاكاة الكتابة البشرية
    for (const char of text) {
      await element.type(char, { delay: this.getRandomDelay('typing') });
      
      // أخطاء كتابة عشوائية
      if (Math.random() < 0.05) {
        await element.press('Backspace');
        await this.randomDelay(100, 300);
        await element.type(char, { delay: this.getRandomDelay('typing') });
      }
      
      // فواصل عشوائية
      if (Math.random() < 0.1) {
        await this.randomDelay(500, 1500);
      }
    }
  }

  async humanClick(page, selector) {
    const element = await page.$(selector);
    if (!element) return false;

    // الحصول على إحداثيات العنصر
    const box = await element.boundingBox();
    if (!box) return false;

    // محاكاة حركة الماوس البشرية
    await this.moveMouse(page, box.x + box.width / 2, box.y + box.height / 2);
    
    // تأخير قبل النقر
    await this.randomDelay(200, 800);
    
    // النقر
    await element.click({ delay: this.getRandomDelay() });
    
    // تأخير بعد النقر
    await this.randomDelay(300, 1200);
    
    return true;
  }

  async moveMouse(page, targetX, targetY) {
    // محاكاة مسار منحني للماوس
    const currentPos = { x: 0, y: 0 };
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // منحنى بيزير
      const x = this.bezierPoint(currentPos.x, targetX, t);
      const y = this.bezierPoint(currentPos.y, targetY, t);
      
      await page.mouse.move(x, y);
      await this.randomDelay(10, 50);
    }
  }

  bezierPoint(start, end, t) {
    // منحنى بيزير مكعب
    return start * Math.pow(1 - t, 3) + 
           (start + (end - start) * 0.3) * 3 * Math.pow(1 - t, 2) * t +
           (start + (end - start) * 0.7) * 3 * (1 - t) * Math.pow(t, 2) +
           end * Math.pow(t, 3);
  }

  async randomDelay(min = null, max = null) {
    const delayMin = min || this.config.humanLikeDelays.min;
    const delayMax = max || this.config.humanLikeDelays.max;
    
    const delay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getRandomDelay(type = 'normal') {
    if (type === 'typing') {
      const { min, max } = this.config.humanLikeDelays.typing;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    const { min, max } = this.config.humanLikeDelays;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async takeScreenshot(page, name) {
    const screenshotDir = path.join(__dirname, '../evidences/screenshots');
    await fs.ensureDir(screenshotDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      type: 'png'
    });
    
    return { filename, filepath };
  }

  async getPageMetrics(page) {
    const metrics = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        loaded: document.readyState === 'complete',
        performance: window.performance ? {
          timing: window.performance.timing,
          navigation: window.performance.navigation,
          memory: window.performance.memory
        } : null,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookies: document.cookie.length,
        localStorage: Object.keys(window.localStorage).length,
        sessionStorage: Object.keys(window.sessionStorage).length
      };
    });
    
    return metrics;
  }
}

module.exports = BrowserSimulator;
