const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const fs = require('fs-extra');
const path = require('path');
const { generate: generateFingerprint } = require('fingerprint-generator');

class IdentityManager {
  constructor() {
    this.dbPath = path.join(__dirname, '../databases/identities.json');
    this.encryptionKey = process.env.IDENTITY_ENCRYPTION_KEY || 'default-key-change-in-production';
    this.initializeDatabase();
  }

  initializeDatabase() {
    if (!fs.existsSync(this.dbPath)) {
      fs.ensureFileSync(this.dbPath);
      fs.writeJsonSync(this.dbPath, { identities: [], lastId: 0 });
    }
  }

  encryptData(data) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
  }

  decryptData(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  async generateTempEmail() {
    try {
      // استخدام خدمة بريد مؤقت
      const response = await fetch('https://api.tempmail.lol/generate');
      const data = await response.json();
      return {
        email: data.address,
        token: data.token,
        expires: data.expires_at
      };
    } catch (error) {
      // استخدام بديل إذا فشلت الخدمة
      const randomId = Math.random().toString(36).substring(2, 10);
      return {
        email: `temp_${randomId}@tempmail.lol`,
        token: null,
        expires: Date.now() + 3600000
      };
    }
  }

  generateAcademicInfo() {
    const majors = [
      'Computer Science', 'Engineering', 'Medicine', 'Business', 
      'Psychology', 'Biology', 'Mathematics', 'Physics'
    ];
    
    const universities = [
      'Harvard University', 'Stanford University', 'MIT', 'University of Oxford',
      'University of Cambridge', 'California Institute of Technology', 'Princeton University'
    ];

    return {
      major: faker.helpers.arrayElement(majors),
      university: faker.helpers.arrayElement(universities),
      enrollmentYear: faker.number.int({ min: 2018, max: 2023 }),
      expectedGraduation: faker.number.int({ min: 2024, max: 2027 }),
      gpa: parseFloat((Math.random() * 2 + 2).toFixed(2)),
      courses: Array.from({ length: 5 }, () => faker.word.words(2))
    };
  }

  generateBrowserFingerprint() {
    return generateFingerprint({
      devices: ['desktop'],
      operatingSystems: ['windows', 'macos', 'linux'],
      browsers: ['chrome', 'firefox', 'safari'],
      locales: ['en-US', 'en-GB', 'de-DE', 'fr-FR']
    });
  }

  async generateIdentity(options = {}) {
    const gender = faker.person.sexType();
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName();
    const tempEmail = await this.generateTempEmail();

    const identity = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      
      // المعلومات الشخصية
      personal: {
        firstName,
        lastName,
        gender,
        dateOfBirth: faker.date.birthdate({ min: 18, max: 35, mode: 'age' }).toISOString().split('T')[0],
        ssn: faker.finance.pin(9), // رقم وهمي فقط
        nationality: 'US',
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          country: 'United States'
        }
      },
      
      // معلومات الاتصال
      contact: {
        email: tempEmail.email,
        emailToken: tempEmail.token,
        emailExpires: tempEmail.expires,
        phone: faker.phone.number('+1###-###-####'),
        alternateEmail: faker.internet.email({ firstName, lastName })
      },
      
      // المعلومات الأكاديمية
      academic: options.includeAcademicInfo ? this.generateAcademicInfo() : null,
      
      // بيانات الاعتماد
      credentials: {
        username: faker.internet.userName({ firstName, lastName }),
        password: faker.internet.password({ length: 16, memorable: false }),
        securityQuestions: [
          { question: 'Mother\'s maiden name?', answer: faker.person.lastName() },
          { question: 'First pet\'s name?', answer: faker.animal.dog() },
          { question: 'Birth city?', answer: faker.location.city() }
        ]
      },
      
      // بصمة المتصفح الفريدة
      fingerprint: this.generateBrowserFingerprint(),
      
      // معلومات الشبكة
      network: {
        userAgent: null, // سيتم تعيينه لاحقاً
        timezone: faker.helpers.arrayElement(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']),
        locale: faker.helpers.arrayElement(['en-US', 'en-GB']),
        screenResolution: faker.helpers.arrayElement(['1920x1080', '1366x768', '1536x864']),
        platform: faker.helpers.arrayElement(['Win32', 'MacIntel', 'Linux x86_64'])
      },
      
      // إعدادات النظام
      system: {
        os: faker.helpers.arrayElement(['Windows 10', 'Windows 11', 'macOS Monterey', 'Ubuntu 22.04']),
        browser: faker.helpers.arrayElement(['Chrome 120', 'Firefox 121', 'Safari 17']),
        plugins: Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => faker.company.name()),
        fonts: Array.from({ length: faker.number.int({ min: 20, max: 50 }) }, () => faker.word.adjective() + ' ' + faker.word.noun())
      },
      
      // بيانات الجلسة
      session: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        lastActivity: null
      }
    };

    // تعيين User-Agent بناءً على بصمة المتصفح
    identity.network.userAgent = identity.fingerprint.fingerprint.navigator.userAgent;

    // تشفير وحفظ الهوية
    await this.saveIdentity(identity);
    
    return identity;
  }

  async generateBatch(options = {}) {
    const { count = 10, country = 'US', ageRange = [18, 35], ...otherOptions } = options;
    const identities = [];

    for (let i = 0; i < count; i++) {
      console.log(`Generating identity ${i + 1}/${count}...`);
      const identity = await this.generateIdentity(otherOptions);
      identities.push(identity);
      
      // تأخير لتجنب اكتشاف النظام
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return identities;
  }

  async saveIdentity(identity) {
    const db = await fs.readJson(this.dbPath);
    
    // تشفير البيانات الحساسة قبل الحفظ
    const encryptedIdentity = {
      ...identity,
      personal: this.encryptData(identity.personal),
      contact: this.encryptData(identity.contact),
      credentials: this.encryptData(identity.credentials)
    };

    db.identities.push(encryptedIdentity);
    db.lastId++;
    
    await fs.writeJson(this.dbPath, db, { spaces: 2 });
    
    // حفظ نسخة احتياطية
    const backupDir = path.join(__dirname, '../databases/backups');
    fs.ensureDirSync(backupDir);
    const backupFile = path.join(backupDir, `identities_backup_${Date.now()}.json`);
    await fs.writeJson(backupFile, { identity: encryptedIdentity }, { spaces: 2 });

    return identity.id;
  }

  async getIdentity(id) {
    const db = await fs.readJson(this.dbPath);
    const encryptedIdentity = db.identities.find(id => id.id === id);
    
    if (!encryptedIdentity) return null;

    // فك تشفير البيانات
    return {
      ...encryptedIdentity,
      personal: this.decryptData(encryptedIdentity.personal),
      contact: this.decryptData(encryptedIdentity.contact),
      credentials: this.decryptData(encryptedIdentity.credentials)
    };
  }

  async updateSession(id, sessionData) {
    const db = await fs.readJson(this.dbPath);
    const identityIndex = db.identities.findIndex(id => id.id === id);
    
    if (identityIndex !== -1) {
      db.identities[identityIndex].session = {
        ...db.identities[identityIndex].session,
        ...sessionData,
        lastActivity: new Date().toISOString()
      };
      
      await fs.writeJson(this.dbPath, db, { spaces: 2 });
      return true;
    }
    
    return false;
  }

  async cleanupExpired() {
    const db = await fs.readJson(this.dbPath);
    const now = Date.now();
    
    const activeIdentities = db.identities.filter(identity => {
      if (identity.contact.emailExpires && identity.contact.emailExpires < now) {
        console.log(`Cleaning up expired identity: ${identity.id}`);
        return false;
      }
      return true;
    });
    
    db.identities = activeIdentities;
    await fs.writeJson(this.dbPath, db, { spaces: 2 });
    
    return activeIdentities.length;
  }
}

module.exports = IdentityManager;
