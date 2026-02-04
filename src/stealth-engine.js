const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');

class StealthEngine {
  constructor() {
    this.fingerprintCache = new Map();
    this.behaviorProfiles = this.loadBehaviorProfiles();
  }

  loadBehaviorProfiles() {
    return {
      'student': {
        typingSpeed: { min: 50, max: 150 },
        mouseSpeed: { min: 100, max: 500 },
        scrollBehavior: 'smooth',
        clickAccuracy: 0.9,
        navigationPattern: ['random', 'back', 'refresh'],
        activityHours: [9, 10, 14, 15, 20, 21]
      },
      'researcher': {
        typingSpeed: { min: 40, max: 120 },
        mouseSpeed: { min: 80, max: 400 },
        scrollBehavior: 'precise',
        clickAccuracy: 0.95,
        navigationPattern: ['linear', 'deep', 'bookmark'],
        activityHours: [8, 9, 10, 14, 15, 16, 20]
      },
      'professional': {
        typingSpeed: { min: 60, max: 180 },
        mouseSpeed: { min: 120, max: 600 },
        scrollBehavior: 'fast',
        clickAccuracy: 0.85,
        navigationPattern: ['efficient', 'task-oriented'],
        activityHours: [8, 9, 10, 11, 14, 15, 16, 17]
      }
    };
  }

  generateStealthFingerprint(profileType = 'student') {
    const profile = this.behaviorProfiles[profileType] || this.behaviorProfiles.student;
    const fingerprintId = uuidv4();
    
    const fingerprint = {
      id: fingerprintId,
      profile: profileType,
      canvas: this.generateCanvasFingerprint(),
      webgl: this.generateWebGLFingerprint(),
      audio: this.generateAudioFingerprint(),
      fonts: this.generateFontList(),
      plugins: this.generatePluginList(),
      hardware: this.generateHardwareProfile(),
      behavior: profile,
      timestamp: new Date().toISOString(),
      hash: null
    };
    
    // توليد hash فريد للبصمة
    fingerprint.hash = this.hashFingerprint(fingerprint);
    
    // التخزين المؤقت
    this.fingerprintCache.set(fingerprintId, fingerprint);
    
    return fingerprint;
  }

  generateCanvasFingerprint() {
    // بصمة Canvas فريدة
    return {
      winding: true,
      geometry: 'miter',
      text: 'CanvasFingerprint',
      opacity: 1.0,
      blendMode: 'source-over',
      shadow: {
        blur: 5,
        color: '#000000',
        offsetX: 2,
        offsetY: 2
      }
    };
  }

  generateWebGLFingerprint() {
    // بصمة WebGL فريدة
    const vendors = ['Google Inc.', 'NVIDIA Corporation', 'Intel Inc.', 'AMD'];
    const renderers = [
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0)'
    ];
    
    return {
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      renderer: renderers[Math.floor(Math.random() * renderers.length)],
      version: 'WebGL 2.0',
      shadingLanguage: 'GLSL ES 3.00',
      maxTextureSize: 16384,
      maxRenderBufferSize: 16384,
      unmaskedVendor: 'Google Inc.',
      unmaskedRenderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)))'
    };
  }

  generateAudioFingerprint() {
    // بصمة الصوت
    return {
      sampleRate: 44100,
      channelCount: 2,
      bufferSize: 2048,
      delayTime: 0.1,
      frequency: 440.0,
      duration: 1.0
    };
  }

  generateFontList() {
    // قائمة خطوط عشوائية
    const commonFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
      'Verdana', 'Georgia', 'Palatino', 'Garamond',
      'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black',
      'Impact', 'Lucida Sans Unicode', 'Tahoma', 'Geneva'
    ];
    
    const extraFonts = [
      'Andale Mono', 'Baskerville', 'Didot', 'Futura',
      'Rockwell', 'Segoe UI', 'Optima', 'Franklin Gothic'
    ];
    
    // اختيار عشوائي للخطوط
    const fontCount = Math.floor(Math.random() * 10) + 20;
    const selectedFonts = [...commonFonts];
    
    while (selectedFonts.length < fontCount && extraFonts.length > 0) {
      const randomFont = extraFonts.splice(Math.floor(Math.random() * extraFonts.length), 1)[0];
      selectedFonts.push(randomFont);
    }
    
    return selectedFonts.sort(() => 0.5 - Math.random());
  }

  generatePluginList() {
    // قائمة إضافات المتصفح
    const plugins = [
      { name: 'Chrome PDF Viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer' },
      { name: 'Microsoft Edge PDF Viewer', description: 'Portable Document Format' },
      { name: 'WebKit built-in PDF', description: 'Portable Document Format' },
      { name: 'Native Client', description: 'Native Client Executable' }
    ];
    
    // إضافة إضافات عشوائية
    if (Math.random() > 0.5) {
      plugins.push({ name: 'Widevine Content Decryption Module', description: 'Widevine Content Decryption Module' });
    }
    
    return plugins.slice(0, Math.floor(Math.random() * plugins.length) + 1);
  }

  generateHardwareProfile() {
    // توليد معلمات الأجهزة
    const concurrencyOptions = [2, 4, 6, 8, 12, 16];
    const memoryOptions = [4, 8, 16, 32];
    
    return {
      hardwareConcurrency: concurrencyOptions[Math.floor(Math.random() * concurrencyOptions.length)],
      deviceMemory: memoryOptions[Math.floor(Math.random() * memoryOptions.length)],
      maxTouchPoints: navigator.maxTouchPoints || 0,
      platform: navigator.platform,
      oscpu: navigator.oscpu || 'Intel Mac OS X 10_15_7',
      product: navigator.product || 'Gecko',
      productSub: navigator.productSub || '20030107',
      vendor: navigator.vendor || 'Google Inc.',
      vendorSub: navigator.vendorSub || ''
    };
  }

  hashFingerprint(fingerprint) {
    const dataString = JSON.stringify({
      canvas: fingerprint.canvas,
      webgl: fingerprint.webgl,
      fonts: fingerprint.fonts,
      hardware: fingerprint.hardware
    });
    
    return CryptoJS.SHA256(dataString).toString();
  }

  validateFingerprint(fingerprint) {
    // التحقق من صحة البصمة
    if (!fingerprint || !fingerprint.hash) {
      return { valid: false, reason: 'Invalid fingerprint structure' };
    }
    
    // إعادة حساب الهاش والتحقق منه
    const calculatedHash = this.hashFingerprint(fingerprint);
    if (calculatedHash !== fingerprint.hash) {
      return { valid: false, reason: 'Fingerprint hash mismatch' };
    }
    
    // التحقق من التاريخ
    const fingerprintDate = new Date(fingerprint.timestamp);
    const now = new Date();
    const ageInHours = (now - fingerprintDate) / (1000 * 60 * 60);
    
    if (ageInHours > 24) {
      return { valid: false, reason: 'Fingerprint is too old' };
    }
    
    return { valid: true, age: ageInHours };
  }

  rotateFingerprint(oldFingerprint) {
    // تدوير البصمة للحفاظ على التخفي
    const profile = oldFingerprint.profile || 'student';
    
    const newFingerprint = this.generateStealthFingerprint(profile);
    
    // الحفاظ على بعض العناصر الثابتة
    newFingerprint.id = oldFingerprint.id;
    newFingerprint.sessionId = oldFingerprint.sessionId;
    
    return newFingerprint;
  }

  detectAutomation(page) {
    // كشف مؤشرات التشغيل الآلي
    const detectionPatterns = [
      'webdriver',
      '__driver_evaluate',
      '__webdriver_evaluate',
      '__selenium_evaluate',
      '__fxdriver_evaluate',
      '__driver_unwrapped',
      '__webdriver_unwrapped',
      '__selenium_unwrapped',
      '__fxdriver_unwrapped',
      '_selenium',
      '_Selenium_IDE_Recorder',
      'callSelenium',
      'domAutomation',
      'domAutomationController',
      'phantom'
    ];
    
    return page.evaluate((patterns) => {
      const results = {};
      
      patterns.forEach(pattern => {
        results[pattern] = window[pattern] !== undefined;
      });
      
      // كشف Chrome Headless
      results['chrome_headless'] = navigator.webdriver === true;
      
      // كشف Plugins
      results['plugins_length'] = navigator.plugins.length;
      results['plugins_array'] = Array.from(navigator.plugins).map(p => p.name).join(',');
      
      // كشف Languages
      results['languages'] = navigator.languages.join(',');
      
      // كشف Platform
      results['platform'] = navigator.platform;
      
      // كشف User Agent
      results['userAgent'] = navigator.userAgent;
      
      // كشف Screen Resolution
      results['screen'] = {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      };
      
      return results;
    }, detectionPatterns);
  }

  async applyAntiDetection(page) {
    // تطبيق تقنيات مضادة للكشف
    await page.evaluateOnNewDocument(() => {
      // إخفاء WebDriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });
      
      // إخفاء Chrome
      if (window.chrome) {
        window.chrome = {
          runtime: {},
          loadTimes: () => {},
          csi: () => {},
          app: {}
        };
      }
      
      // تعديل permissions API
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // تعديل Plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
          ];
          
          plugins.__proto__ = PluginArray.prototype;
          return plugins;
        },
        configurable: true
      });
      
      // تعديل Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });
      
      // تعديل Platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
      });
      
      // إضافة متغيرات عشوائية
      window.randomSeed = Math.random().toString(36).substring(7);
      window.pageViewStart = Date.now();
      
      // محاكاة أخطاء JavaScript طبيعية
      if (Math.random() < 0.01) {
        setTimeout(() => {
          throw new Error('Simulated JavaScript error');
        }, Math.random() * 10000);
      }
    });
  }

  generateBehaviorSequence(profileType) {
    // توليد تسلسل سلوك بشري
    const profile = this.behaviorProfiles[profileType] || this.behaviorProfiles.student;
    
    const behaviors = [];
    const steps = Math.floor(Math.random() * 20) + 10;
    
    for (let i = 0; i < steps; i++) {
      behaviors.push({
        type: this.getRandomBehaviorType(),
        duration: Math.floor(Math.random() * (profile.mouseSpeed.max - profile.mouseSpeed.min)) + profile.mouseSpeed.min,
        accuracy: profile.clickAccuracy,
        timestamp: Date.now() + (i * 1000)
      });
    }
    
    return behaviors;
  }

  getRandomBehaviorType() {
    const types = ['click', 'scroll', 'hover', 'type', 'navigate', 'pause'];
    return types[Math.floor(Math.random() * types.length)];
  }

  async simulateHumanBehavior(page, behaviorSequence) {
    // محاكاة التسلسل السلوكي
    for (const behavior of behaviorSequence) {
      switch (behavior.type) {
        case 'click':
          await this.simulateClick(page, behavior);
          break;
        case 'scroll':
          await this.simulateScroll(page, behavior);
          break;
        case 'hover':
          await this.simulateHover(page, behavior);
          break;
        case 'pause':
          await new Promise(resolve => setTimeout(resolve, behavior.duration));
          break;
      }
      
      // تأخير عشوائي بين السلوكيات
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }
  }

  async simulateClick(page, behavior) {
    // محاكاة نقرة بشرية
    const viewport = page.viewportSize();
    const x = Math.floor(Math.random() * viewport.width * behavior.accuracy);
    const y = Math.floor(Math.random() * viewport.height * behavior.accuracy);
    
    await page.mouse.move(x, y, { steps: 10 });
    await page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 50));
    await page.mouse.up();
  }

  async simulateScroll(page, behavior) {
    // محاكاة التمرير البشري
    const scrollAmount = Math.floor(Math.random() * 500) + 100;
    await page.mouse.wheel(0, scrollAmount);
  }

  async simulateHover(page, behavior) {
    // محاكاة التحويم
    const viewport = page.viewportSize();
    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);
    
    await page.mouse.move(x, y, { steps: 20 });
  }

  getStealthScore(pageMetrics) {
    // حساب درجة التخفي
    let score = 100;
    
    // خصم نقاط لمؤشرات التشغيل الآلي
    if (pageMetrics.webdriver === true) score -= 50;
    if (pageMetrics.plugins_length < 2) score -= 20;
    if (pageMetrics.plugins_array.includes('Chrome PDF Viewer')) score += 10;
    
    // خصم نقاط لعدم وجود أخطاء
    if (!pageMetrics.js_errors || pageMetrics.js_errors.length === 0) score -= 10;
    
    // إضافة نقاط للسلوك البشري
    if (pageMetrics.mouse_movements > 10) score += 20;
    if (pageMetrics.scroll_events > 5) score += 15;
    if (pageMetrics.session_duration > 300000) score += 25; // أكثر من 5 دقائق
    
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = StealthEngine;
