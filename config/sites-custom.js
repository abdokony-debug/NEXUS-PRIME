module.exports = {
  // اسم الورقة الرئيسية
  sheetName: 'Google Workspace',
  
  // هيكل الجدول كما في الصورة
  tableStructure: {
    startRow: 3, // يبدأ من الصف 3
    columns: {
      platform: 0, // Platform_Name
      link: 1,     // Link_URL
      count: 2,    // Added_Count
      status: 3    // Status
    },
    headers: ['Platform_Name', 'Link_URL', 'Added_Count', 'Status']
  },
  
  // أنواع المنصات المختلفة
  platformTypes: {
    'prizes gamee': {
      type: 'gaming',
      selectors: {
        signupButton: 'button.sign-up, a.register',
        emailField: 'input[type="email"]',
        passwordField: 'input[type="password"]',
        submitButton: 'button[type="submit"]',
        successIndicator: '.welcome, .success, h1:contains("Welcome")'
      },
      requiredFields: ['email', 'password']
    },
    'freecash': {
      type: 'reward',
      selectors: {
        registerLink: 'a[href*="/register"]',
        emailField: '#email',
        usernameField: '#username',
        passwordField: '#password',
        referralField: '#referral',
        submitButton: 'button.register-btn'
      }
    },
    'pawns.app': {
      type: 'survey',
      selectors: {
        signupForm: '.signup-form',
        emailInput: 'input[name="email"]',
        passwordInput: 'input[name="password"]',
        continueButton: 'button:contains("Continue")'
      }
    },
    'extrabux': {
      type: 'cashback',
      selectors: {
        joinNow: 'a.join-now',
        email: 'input#email',
        password: 'input#password',
        createAccount: 'button.create-account'
      }
    },
    'swagbucks': {
      type: 'rewards',
      selectors: {
        joinButton: '.join-btn',
        emailField: '#joinEmail',
        passwordField: '#joinPassword',
        confirmButton: '#joinConfirm'
      }
    }
  },
  
  // إعدادات التنفيذ
  execution: {
    maxAccountsPerPlatform: 5, // كما في Added_Count
    delayBetweenRegistrations: 3000, // 3 ثواني بين التسجيلات
    timeoutPerPlatform: 30000, // 30 ثانية لكل منصة
    retryAttempts: 2
  },
  
  // أنماط النجاح
  successPatterns: [
    'welcome',
    'success',
    'thank you',
    'congratulations',
    'account created',
    'registration complete'
  ],
  
  // ملفات السجلات
  logging: {
    successLog: 'successful_registrations.csv',
    errorLog: 'failed_registrations.csv',
    screenshotDir: 'platform_screenshots'
  }
};
