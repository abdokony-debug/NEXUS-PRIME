#!/usr/bin/env node

const { program } = require('yargs');
const chalk = require('chalk');
const ora = require('ora');
const moment = require('moment');
const fs = require('fs-extra');
const path = require('path');

// استيراد الموديولات المتقدمة
const IdentityManager = require('./identity-manager');
const ProxyRotator = require('./proxy-rotator');
const BrowserSimulator = require('./browser-simulator');
const ReferralProcessor = require('./referral-processor');
const AcademicAutomator = require('./academic-automator');
const StealthEngine = require('./stealth-engine');
const ReportGenerator = require('./report-generator');
const DatabaseManager = require('./database-manager');

// تكوين CLI متقدم
program
  .option('-m, --mode <type>', 'Simulation mode', 'stealth')
  .option('-i, --identities <number>', 'Number of identities', 10)
  .option('-r, --referrals <number>', 'Referrals per identity', 5)
  .option('-b, --batch <number>', 'Batch number', 1)
  .option('-tb, --total-batches <number>', 'Total batches', 1)
  .option('-u, --universities <file>', 'Universities JSON file')
  .option('-p, --proxies <file>', 'Proxies JSON file')
  .option('-d, --delay <seconds>', 'Delay between actions', 3)
  .parse(process.argv);

const options = program.opts();

class AdvancedSimulationSystem {
  constructor(config) {
    this.config = config;
    this.identities = [];
    this.results = [];
    this.stats = {
      startTime: null,
      endTime: null,
      totalIdentities: 0,
      successfulReferrals: 0,
      failedReferrals: 0,
      completedUniversities: 0
    };
    this.logger = this.setupLogger();
  }

  setupLogger() {
    const logDir = path.join(__dirname, '../evidences/logs');
    fs.ensureDirSync(logDir);
    
    const logFile = path.join(logDir, `simulation_${moment().format('YYYYMMDD_HHmmss')}.log`);
    
    return {
      info: (msg) => {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const message = `[${timestamp}] [INFO] ${msg}`;
        console.log(chalk.blue(message));
        fs.appendFileSync(logFile, message + '\n');
      },
      success: (msg) => {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const message = `[${timestamp}] [SUCCESS] ${msg}`;
        console.log(chalk.green(message));
        fs.appendFileSync(logFile, message + '\n');
      },
      error: (msg, err) => {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const message = `[${timestamp}] [ERROR] ${msg}: ${err?.message || err}`;
        console.error(chalk.red(message));
        fs.appendFileSync(logFile, message + '\n');
      },
      warning: (msg) => {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const message = `[${timestamp}] [WARNING] ${msg}`;
        console.warn(chalk.yellow(message));
        fs.appendFileSync(logFile, message + '\n');
      }
    };
  }

  async initialize() {
    this.stats.startTime = moment();
    this.logger.info('🚀 Initializing Advanced Simulation System');
    
    // تهيئة جميع المكونات
    await this.initializeComponents();
    
    this.logger.success('✅ System initialized successfully');
  }

  async initializeComponents() {
    const components = [
      { name: 'Database', instance: new DatabaseManager() },
      { name: 'Proxy Rotator', instance: new ProxyRotator() },
      { name: 'Identity Manager', instance: new IdentityManager() },
      { name: 'Stealth Engine', instance: new StealthEngine() },
      { name: 'Browser Simulator', instance: new BrowserSimulator() }
    ];

    for (const component of components) {
      try {
        await component.instance.initialize();
        this.logger.success(`✅ ${component.name} initialized`);
      } catch (error) {
        this.logger.error(`Failed to initialize ${component.name}`, error);
        throw error;
      }
    }
  }

  async generateIdentities() {
    this.logger.info(`🔄 Generating ${this.config.identities} identities...`);
    
    const identityManager = new IdentityManager();
    this.identities = await identityManager.generateBatch({
      count: this.config.identities,
      country: 'US',
      ageRange: [18, 35],
      includeTempEmail: true,
      includeAcademicInfo: true
    });

    this.logger.success(`✅ Generated ${this.identities.length} identities`);
    return this.identities;
  }

  async processIdentity(identity, index) {
    this.logger.info(`👤 Processing identity ${index + 1}/${this.identities.length}: ${identity.email}`);
    
    const result = {
      identityId: identity.id,
      email: identity.email,
      proxyUsed: null,
      referrals: [],
      universities: [],
      startTime: moment(),
      endTime: null,
      status: 'processing'
    };

    try {
      // 1. الحصول على بروكسي فريد
      const proxyRotator = new ProxyRotator();
      const proxy = await proxyRotator.getProxy();
      result.proxyUsed = proxy;

      // 2. تكوين محاكي المتصفح مع بصمة فريدة
      const browserSimulator = new BrowserSimulator();
      const browser = await browserSimulator.launch({
        proxy: proxy,
        fingerprint: identity.fingerprint,
        stealthLevel: this.config.mode === 'stealth' ? 'high' : 'medium'
      });

      // 3. تنفيذ عمليات التسجيل الجامعي
      const academicAutomator = new AcademicAutomator();
      const universityResults = await academicAutomator.processIdentity({
        identity: identity,
        browser: browser,
        maxUniversities: 3
      });

      result.universities = universityResults;

      // 4. تنفيذ عمليات الإحالة
      const referralProcessor = new ReferralProcessor();
      const referralResults = await referralProcessor.processReferrals({
        identity: identity,
        browser: browser,
        count: this.config.referrals,
        delay: this.config.delay * 1000
      });

      result.referrals = referralResults;

      // 5. تحديث الإحصائيات
      result.status = 'completed';
      result.successCount = referralResults.filter(r => r.success).length;
      result.failCount = referralResults.filter(r => !r.success).length;

      this.stats.successfulReferrals += result.successCount;
      this.stats.failedReferrals += result.failCount;

      // 6. إغلاق المتصرف بأمان
      await browser.close();

      this.logger.success(`✅ Identity ${identity.email} completed: ${result.successCount} successful, ${result.failCount} failed`);

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      this.logger.error(`❌ Identity ${identity.email} failed`, error);
    } finally {
      result.endTime = moment();
      return result;
    }
  }

  async run() {
    const spinner = ora('Starting advanced simulation...').start();
    
    try {
      // الخطوة 1: التهيئة
      spinner.text = 'Initializing system components...';
      await this.initialize();

      // الخطوة 2: توليد الهويات
      spinner.text = 'Generating unique identities...';
      await this.generateIdentities();

      // الخطوة 3: معالجة كل هوية
      for (let i = 0; i < this.identities.length; i++) {
        const identity = this.identities[i];
        spinner.text = `Processing identity ${i + 1}/${this.identities.length}...`;
        
        const result = await this.processIdentity(identity, i);
        this.results.push(result);

        // تأخير طبيعي بين الهويات
        if (i < this.identities.length - 1) {
          const delay = Math.floor(Math.random() * 10000) + 5000; // 5-15 ثانية
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // الخطوة 4: توليد التقارير
      spinner.text = 'Generating comprehensive reports...';
      await this.generateReports();

      // الخطوة 5: إظهار النتائج النهائية
      spinner.succeed('Simulation completed successfully!');
      this.displayFinalStats();

    } catch (error) {
      spinner.fail('Simulation failed!');
      this.logger.error('Fatal error in simulation', error);
      process.exit(1);
    }
  }

  async generateReports() {
    const reportGenerator = new ReportGenerator();
    
    // توليد أنواع مختلفة من التقارير
    await reportGenerator.generate({
      type: 'detailed',
      data: this.results,
      output: path.join(__dirname, '../evidences/reports/detailed_report.json')
    });

    await reportGenerator.generate({
      type: 'summary',
      data: this.results,
      output: path.join(__dirname, '../evidences/reports/summary_report.html')
    });

    await reportGenerator.generate({
      type: 'analytics',
      data: this.results,
      output: path.join(__dirname, '../evidences/reports/analytics.json')
    });

    this.logger.success('📊 All reports generated successfully');
  }

  displayFinalStats() {
    const duration = moment.duration(moment().diff(this.stats.startTime));
    
    console.log(chalk.yellow('\n📈 ======= SIMULATION RESULTS =======\n'));
    console.log(chalk.cyan(`   Total Identities: ${this.identities.length}`));
    console.log(chalk.cyan(`   Total Referrals: ${this.stats.successfulReferrals + this.stats.failedReferrals}`));
    console.log(chalk.green(`   Successful: ${this.stats.successfulReferrals}`));
    console.log(chalk.red(`   Failed: ${this.stats.failedReferrals}`));
    console.log(chalk.cyan(`   Success Rate: ${((this.stats.successfulReferrals / (this.stats.successfulReferrals + this.stats.failedReferrals)) * 100).toFixed(2)}%`));
    console.log(chalk.cyan(`   Duration: ${duration.hours()}h ${duration.minutes()}m ${duration.seconds()}s`));
    console.log(chalk.cyan(`   Average Time per Identity: ${(duration.asMinutes() / this.identities.length).toFixed(2)} minutes`));
    console.log(chalk.yellow('\n====================================\n'));
  }
}

// التنفيذ الرئيسي
(async () => {
  try {
    const simulation = new AdvancedSimulationSystem(options);
    await simulation.run();
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
})();
