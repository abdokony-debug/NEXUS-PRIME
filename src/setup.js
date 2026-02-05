const fs = require('fs');
const path = require('path');

console.log('🔧 إعداد نظام WAHAB...\n');

// 1. إنشاء مجلدات
const folders = [
    'screenshots',
    'logs',
    'data',
    'reports'
];

folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ تم إنشاء مجلد: ${folder}`);
    }
});

// 2. إنشاء ملف .env إذا لم يكن موجوداً
const envExample = `# 🔗 رابط Google Sheet (من صورتك)
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit

# 📧 البريد من Service Account
GOOGLE_CLIENT_EMAIL=your-service@project.iam.gserviceaccount.com

# 🔐 المفتاح من Service Account
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...المفتاح الكامل...\\n-----END PRIVATE KEY-----\\n

# ⚙️ إعدادات النظام
OPERATION_MODE=fast
MAX_PLATFORMS=5
`;

if (!fs.existsSync('.env')) {
    fs.writeFileSync('.env', envExample);
    console.log('✅ تم إنشاء ملف .env.example');
    console.log('📝 يرجى تعديله بإضافة رابط الشيت والمفاتيح');
}

// 3. إنشاء ملف package.json إذا لم يكن موجوداً
if (!fs.existsSync('package.json')) {
    const packageJson = {
        name: "wahab-automation-system",
        version: "1.0.0",
        main: "src/index.js",
        scripts: {
            start: "node src/index.js",
            setup: "node src/setup.js",
            test: "node src/quick-test.js"
        },
        dependencies: {
            "playwright": "^1.41.0",
            "dotenv": "^16.3.0"
        }
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ تم إنشاء package.json');
}

console.log('\n📋 الخطوات التالية:');
console.log('1. npm install');
console.log('2. تعديل ملف .env بإضافة رابط الشيت');
console.log('3. npm start');
