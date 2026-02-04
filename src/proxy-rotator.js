const ProxyChain = require('proxy-chain');
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');

class ProxyRotator {
  constructor() {
    this.proxiesFile = path.join(__dirname, '../databases/proxies.json');
    this.activeProxies = [];
    this.failedProxies = new Set();
    this.proxyStats = {};
    this.initialize();
  }

  async initialize() {
    // تحميل قائمة البروكسيات
    await this.loadProxies();
    
    // اختبار البروكسيات النشطة
    await this.testProxies();
    
    // بدء تحديث دوري للبروكسيات
    this.startProxyUpdater();
  }

  async loadProxies() {
    try {
      if (fs.existsSync(this.proxiesFile)) {
        const data = await fs.readJson(this.proxiesFile);
        this.activeProxies = data.proxies || [];
        this.proxyStats = data.stats || {};
      } else {
        // تحميل بروكسيات افتراضية
        await this.fetchFreshProxies();
      }
    } catch (error) {
      console.error('Error loading proxies:', error);
      await this.fetchFreshProxies();
    }
  }

  async fetchFreshProxies() {
    try {
      // مصادر متعددة للبروكسيات
      const sources = [
        'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
        'https://www.proxy-list.download/api/v1/get?type=http',
        'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt'
      ];

      const allProxies = new Set();

      for (const source of sources) {
        try {
          const response = await fetch(source, { timeout: 10000 });
          const text = await response.text();
          const proxies = text.split('\n')
            .filter(line => line.trim())
            .map(line => line.trim());

          proxies.forEach(proxy => allProxies.add(proxy));
        } catch (error) {
          console.warn(`Failed to fetch from ${source}:`, error.message);
        }
      }

      this.activeProxies = Array.from(allProxies);
      
      // حفظ البروكسيات الجديدة
      await this.saveProxies();
      
      console.log(`Loaded ${this.activeProxies.length} fresh proxies`);
    } catch (error) {
      console.error('Error fetching fresh proxies:', error);
      // استخدام بروكسيات احتياطية
      this.activeProxies = this.getBackupProxies();
    }
  }

  getBackupProxies() {
    return [
      '103.152.112.162:80',
      '45.8.106.59:80',
      '20.210.113.32:80',
      '20.206.106.192:80',
      '157.245.27.9:3128',
      '138.68.60.8:8080',
      '209.97.150.167:8080',
      '51.158.68.68:8811',
      '188.166.56.246:80',
      '159.203.61.169:8080'
    ];
  }

  async testProxies() {
    console.log('Testing proxies...');
    const testPromises = this.activeProxies.map(async (proxy, index) => {
      try {
        const [host, port] = proxy.split(':');
        const proxyUrl = `http://${host}:${port}`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch('http://httpbin.org/ip', {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0' },
          agent: new (require('https-proxy-agent'))(proxyUrl)
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          const data = await response.json();
          const speed = Date.now() - startTime;
          
          this.proxyStats[proxy] = {
            success: true,
            lastTested: new Date().toISOString(),
            responseTime: speed,
            country: data.origin ? this.geoipLookup(data.origin) : 'Unknown'
          };
          
          return { proxy, success: true, speed };
        } else {
          this.failedProxies.add(proxy);
          return { proxy, success: false };
        }
      } catch (error) {
        this.failedProxies.add(proxy);
        return { proxy, success: false };
      }
    });

    const results = await Promise.all(testPromises);
    const workingProxies = results.filter(r => r.success).length;
    
    console.log(`Proxy test completed: ${workingProxies}/${this.activeProxies.length} working`);
    
    // تحديث القائمة وحذف الفاشلة
    this.activeProxies = this.activeProxies.filter(p => !this.failedProxies.has(p));
    await this.saveProxies();
  }

  async getProxy(options = {}) {
    const { 
      type = 'http', 
      country = null, 
      anonymity = 'elite',
      maxResponseTime = 5000 
    } = options;

    // تصفية البروكسيات حسب المعايير
    let filteredProxies = this.activeProxies.filter(proxy => {
      const stats = this.proxyStats[proxy];
      if (!stats || !stats.success) return false;
      if (stats.responseTime > maxResponseTime) return false;
      if (country && stats.country !== country) return false;
      return true;
    });

    if (filteredProxies.length === 0) {
      console.warn('No suitable proxies found, using fallback');
      filteredProxies = this.activeProxies;
    }

    // اختيار بروكسي عشوائي مع تحيز نحو الأسرع
    const sortedProxies = filteredProxies.sort((a, b) => {
      const timeA = this.proxyStats[a]?.responseTime || 10000;
      const timeB = this.proxyStats[b]?.responseTime || 10000;
      return timeA - timeB;
    });

    // اختيار من أفضل 3 بروكسيات
    const topProxies = sortedProxies.slice(0, Math.min(3, sortedProxies.length));
    const selectedProxy = topProxies[Math.floor(Math.random() * topProxies.length)];

    // تحديث إحصائيات الاستخدام
    if (this.proxyStats[selectedProxy]) {
      this.proxyStats[selectedProxy].lastUsed = new Date().toISOString();
      this.proxyStats[selectedProxy].useCount = (this.proxyStats[selectedProxy].useCount || 0) + 1;
    }

    // إنشاء سلسلة بروكسي
    const [host, port] = selectedProxy.split(':');
    
    return {
      server: `http://${host}:${port}`,
      host,
      port: parseInt(port),
      type,
      fullUrl: `http://${host}:${port}`,
      stats: this.proxyStats[selectedProxy] || {}
    };
  }

  async createProxyChain(proxy) {
    // إنشاء سلسلة بروكسي للمزيد من التمويه
    const server = new ProxyChain.Server({
      port: 0, // منفذ عشوائي
      prepareRequestFunction: ({ request }) => {
        return {
          requestAuthentication: false,
          upstreamProxyUrl: proxy.server
        };
      }
    });

    await server.listen();
    
    return {
      chainUrl: `http://127.0.0.1:${server.port}`,
      server,
      originalProxy: proxy
    };
  }

  geoipLookup(ip) {
    // دالة مبسطة لتحديد البلد (يمكن استبدالها بخدمة حقيقية)
    const ipRanges = {
      'US': ['104.', '107.', '108.', '131.', '132.', '134.', '136.', '137.'],
      'GB': ['2.', '5.', '31.', '37.', '46.', '51.', '52.', '62.'],
      'DE': ['78.', '79.', '80.', '81.', '82.', '83.', '84.', '85.'],
      'FR': ['78.', '79.', '80.', '81.', '82.', '83.', '84.', '85.'],
      'CA': ['24.', '64.', '65.', '66.', '67.', '68.', '69.', '70.']
    };

    for (const [country, ranges] of Object.entries(ipRanges)) {
      if (ranges.some(range => ip.startsWith(range))) {
        return country;
      }
    }

    return 'Unknown';
  }

  async saveProxies() {
    const data = {
      proxies: this.activeProxies,
      stats: this.proxyStats,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeJson(this.proxiesFile, data, { spaces: 2 });
  }

  startProxyUpdater() {
    // تحديث البروكسيات كل ساعة
    setInterval(async () => {
      console.log('Updating proxy list...');
      await this.fetchFreshProxies();
      await this.testProxies();
    }, 3600000); // كل ساعة
  }

  getStats() {
    const total = this.activeProxies.length;
    const working = Object.values(this.proxyStats).filter(s => s.success).length;
    
    return {
      totalProxies: total,
      workingProxies: working,
      successRate: total > 0 ? ((working / total) * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  calculateAverageResponseTime() {
    const workingStats = Object.values(this.proxyStats).filter(s => s.success && s.responseTime);
    if (workingStats.length === 0) return 0;
    
    const sum = workingStats.reduce((acc, stats) => acc + stats.responseTime, 0);
    return Math.round(sum / workingStats.length);
  }
}

module.exports = ProxyRotator;
