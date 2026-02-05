const referralSchema = require('./referral-sites-schema');

module.exports = {
  // ... التكوين الحالي ...
  
  // إضافة تكوين Google Sheets الجديد
  googleSheets: {
    // استخدام الهيكل من الصورة
    referralSheet: referralSchema,
    
    // أسماء الأوراق الأخرى
    sheets: {
      identities: 'Identities',
      results: 'Results',
      dashboard: 'Dashboard'
    }
  },
  
  // إعدادات معالجة المنصات
  platformProcessing: {
    maxConcurrent: 2,
    delayBetweenPlatforms: {
      min: 3000,
      max: 10000
    },
    successIndicators: [
      'thank you',
      'success',
      'registered',
      'welcome',
      'congratulations'
    ]
  }
};
