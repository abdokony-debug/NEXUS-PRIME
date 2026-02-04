const fs = require('fs-extra');
const path = require('path');

class AcademicAutomator {
  constructor() {
    this.universities = this.loadUniversities();
    this.courses = this.loadCourses();
  }

  loadUniversities() {
    const univPath = path.join(__dirname, '../config/universities.json');
    
    if (fs.existsSync(univPath)) {
      return fs.readJsonSync(univPath);
    }
    
    // جامعات افتراضية
    return {
      'Harvard University': {
        url: 'https://harvard.edu/apply',
        applicationForm: {
          personalInfo: {
            firstName: '#firstName',
            lastName: '#lastName',
            email: '#email',
            dob: '#dateOfBirth'
          },
          academicInfo: {
            gpa: '#gpa',
            sat: '#satScore',
            essay: '#personalEssay',
            transcripts: '#transcriptsUpload'
          },
          submit: 'button[type="submit"]'
        },
        requirements: {
          minGPA: 3.7,
          satRequired: true,
          essays: 2,
          recommendationLetters: 2
        }
      },
      'Stanford University': {
        url: 'https://stanford.edu/admissions',
        applicationForm: {
          email: 'input[type="email"]',
          fullName: '#fullName',
          major: '#intendedMajor',
          achievements: '#achievements'
        },
        captcha: true,
        multiStep: true
      }
    };
  }

  loadCourses() {
    return {
      'Computer Science': ['CS101', 'CS201', 'CS301', 'CS401'],
      'Engineering': ['ENG101', 'ENG201', 'MATH301', 'PHYS401'],
      'Medicine': ['BIO101', 'CHEM201', 'ANAT301', 'PHYS401'],
      'Business': ['BUS101', 'ECON201', 'MGMT301', 'FIN401']
    };
  }

  async processIdentity(options) {
    const { identity, browser, maxUniversities = 3 } = options;
    
    const selectedUnivs = this.selectRandomUniversities(maxUniversities);
    const results = [];
    
    for (const univName of selectedUnivs) {
      const univConfig = this.universities[univName];
      
      console.log(`Processing application for ${univName}`);
      
      try {
        const result = await this.processUniversityApplication({
          university: univConfig,
          univName,
          identity,
          browser
        });
        
        results.push(result);
        
        // تأخير بين التطبيقات
        await this.randomDelay(10000, 30000);
        
      } catch (error) {
        console.error(`Failed to process application for ${univName}:`, error);
        results.push({
          university: univName,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  selectRandomUniversities(count) {
    const allUnivs = Object.keys(this.universities);
    const shuffled = [...allUnivs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async processUniversityApplication({ university, univName, identity, browser }) {
    const page = await browser.context.newPage();
    const startTime = Date.now();
    
    try {
      // الانتقال إلى صفحة التقديم
      await page.goto(university.url, { waitUntil: 'networkidle' });
      
      // ملء نموذج التقديم
      const formResult = await this.fillApplicationForm(page, university, identity);
      
      // رفع الملفات إذا لزم الأمر
      if (university.requirements?.transcripts) {
        await this.uploadTranscripts(page, identity);
      }
      
      // حل الكابتشا إذا وجدت
      if (university.captcha) {
        await this.solveUniversityCaptcha(page);
      }
      
      // تقديم الطلب
      await this.submitApplication(page, university);
      
      // التحقق من النجاح
      const success = await this.verifyApplicationSuccess(page);
      
      // التقاط لقطات
      const screenshot = await browser.takeScreenshot(page, `application_${univName.replace(/\s+/g, '_')}`);
      
      const result = {
        university: univName,
        success,
        formFilled: formResult,
        duration: Date.now() - startTime,
        screenshot: screenshot.filename,
        timestamp: new Date().toISOString()
      };
      
      // حفظ النتيجة
      await this.saveApplicationResult(result, identity.id);
      
      return result;
      
    } finally {
      await page.close();
    }
  }

  async fillApplicationForm(page, university, identity) {
    const formConfig = university.applicationForm;
    const results = [];
    
    // ملء المعلومات الشخصية
    if (formConfig.personalInfo) {
      for (const [field, selector] of Object.entries(formConfig.personalInfo)) {
        if (selector && identity.personal[field]) {
          await browser.humanType(page, selector, identity.personal[field]);
          results.push({ field, success: true });
          await this.randomDelay(500, 1500);
        }
      }
    }
    
    // ملء المعلومات الأكاديمية
    if (formConfig.academicInfo && identity.academic) {
      for (const [field, selector] of Object.entries(formConfig.academicInfo)) {
        if (selector && identity.academic[field]) {
          await browser.humanType(page, selector, identity.academic[field].toString());
          results.push({ field, success: true });
          await this.randomDelay(500, 1500);
        }
      }
    }
    
    // كتابة المقال الشخصي
    if (formConfig.essay && identity.academic) {
      const essay = this.generatePersonalEssay(identity);
      await browser.humanType(page, formConfig.essay, essay);
      results.push({ field: 'essay', success: true });
    }
    
    return results;
  }

  generatePersonalEssay(identity) {
    const templates = [
      `As a passionate ${identity.academic.major.toLowerCase()} student from ${identity.personal.address.city}, 
      I have always been fascinated by the intersection of technology and innovation. 
      My academic journey has equipped me with skills in ${identity.academic.courses.slice(0, 3).join(', ')}.`,
      
      `Growing up in ${identity.personal.address.state}, I developed a keen interest in ${identity.academic.major.toLowerCase()}. 
      My GPA of ${identity.academic.gpa} reflects my dedication to academic excellence.`,
      
      `My goal is to contribute to the field of ${identity.academic.major.toLowerCase()} through research and innovation. 
      I believe my background in ${identity.academic.courses.slice(0, 2).join(' and ')} provides a strong foundation for advanced study.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  async uploadTranscripts(page, identity) {
    // إنشاء نسخة وهمية من السجل الأكاديمي
    const transcriptContent = this.generateTranscript(identity);
    const transcriptPath = path.join(__dirname, '../evidences/data', `transcript_${identity.id}.txt`);
    
    await fs.writeFile(transcriptPath, transcriptContent);
    
    // رفع الملف (يتطلب عنصر input من نوع file)
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(transcriptPath);
    }
  }

  generateTranscript(identity) {
    const courses = this.courses[identity.academic.major] || ['MATH101', 'ENG101', 'SCI101', 'HUM101'];
    const transcript = [];
    
    transcript.push(`${identity.academic.university} - Official Transcript`);
    transcript.push(`Student: ${identity.personal.firstName} ${identity.personal.lastName}`);
    transcript.push(`ID: ${identity.id}`);
    transcript.push(`Major: ${identity.academic.major}`);
    transcript.push('='.repeat(50));
    
    courses.forEach(course => {
      const grade = (Math.random() * 1.5 + 2.5).toFixed(2); // درجات بين 2.5 و 4.0
      const credits = 3;
      transcript.push(`${course.padEnd(10)} ${grade.padStart(5)} ${credits} CR`);
    });
    
    transcript.push('='.repeat(50));
    transcript.push(`GPA: ${identity.academic.gpa}`);
    transcript.push(`Credits Completed: ${courses.length * 3}`);
    
    return transcript.join('\n');
  }

  async solveUniversityCaptcha(page) {
    // محاولة حل كابتشا الجامعة
    await page.waitForTimeout(5000);
    
    // التحقق من وجود كابتشا
    const captchaSelectors = ['.g-recaptcha', 'iframe[src*="recaptcha"]', 'div.captcha'];
    
    for (const selector of captchaSelectors) {
      if (await page.$(selector)) {
        console.log('University CAPTCHA detected, attempting to solve...');
        await page.waitForTimeout(10000); // وقت للتحقق البشري
        break;
      }
    }
  }

  async submitApplication(page, university) {
    const submitSelector = university.applicationForm.submit || 'button[type="submit"]';
    
    await browser.humanClick(page, submitSelector);
    
    // انتظار التأكيد
    await page.waitForTimeout(5000);
  }

  async verifyApplicationSuccess(page) {
    const successIndicators = [
      'Thank you for your application',
      'Application submitted successfully',
      'Confirmation',
      'reference number',
      'Your application ID is'
    ];
    
    const content = await page.content();
    
    for (const indicator of successIndicators) {
      if (content.includes(indicator)) {
        return true;
      }
    }
    
    return false;
  }

  async saveApplicationResult(result, identityId) {
    const appsPath = path.join(__dirname, '../databases/applications.json');
    
    let allApplications = [];
    if (fs.existsSync(appsPath)) {
      allApplications = await fs.readJson(appsPath);
    }
    
    allApplications.push({
      ...result,
      identityId,
      processedAt: new Date().toISOString()
    });
    
    await fs.writeJson(appsPath, allApplications, { spaces: 2 });
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getApplicationStats() {
    const appsPath = path.join(__dirname, '../databases/applications.json');
    
    if (!fs.existsSync(appsPath)) {
      return { total: 0, successful: 0, rate: '0%' };
    }
    
    const applications = fs.readJsonSync(appsPath);
    const successful = applications.filter(app => app.success).length;
    
    return {
      totalApplications: applications.length,
      successfulApplications: successful,
      successRate: applications.length > 0 ? ((successful / applications.length) * 100).toFixed(2) + '%' : '0%'
    };
  }
}

module.exports = AcademicAutomator;
