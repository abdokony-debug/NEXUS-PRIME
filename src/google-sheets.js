const { google } = require('googleapis');
const { log } = require('./utils/helpers');

class GoogleSheetsManager {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = null;
    this.sheetName = 'Kony_Campaign_Tracker';
  }

  async initialize() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      log.info('✅ تم الاتصال بـ Google Sheets');
      
      // التأكد من وجود الشيت
      await this.ensureSheetExists();
      
    } catch (error) {
      log.error('❌ فشل الاتصال بـ Google Sheets:', error.message);
      throw error;
    }
  }

  async ensureSheetExists() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const sheetExists = response.data.sheets.some(
        sheet => sheet.properties.title === this.sheetName
      );
      
      if (!sheetExists) {
        await this.createSheet();
      }
      
    } catch (error) {
      // إذا كان الشيت غير موجود، أنشئه
      if (error.code === 404) {
        log.warn('📄 الشيت غير موجود، سيتم إنشاؤه');
        await this.createSpreadsheet();
      } else {
        throw error;
      }
    }
  }

  async createSpreadsheet() {
    const response = await this.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: 'Kony Marketing System'
        },
        sheets: [{
          properties: {
            title: this.sheetName,
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 26 // A-Z
            }
          }
        }]
      }
    });
    
    this.spreadsheetId = response.data.spreadsheetId;
    log.info(`📄 تم إنشاء شيت جديد: ${this.spreadsheetId}`);
    
    await this.setupHeaders();
  }

  async createSheet() {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: this.sheetName,
              gridProperties: {
                frozenRowCount: 1,
                columnCount: 26
              }
            }
          }
        }]
      }
    });
    
    await this.setupHeaders();
  }

  async setupHeaders() {
    const headers = [
      ['Product_Name', 'Keywords', 'Product_URL', 'Region', 'Target_ID', 'Platform', 
       'Username', 'Profile_URL', 'Intent_Score', 'Contact_Method', 'Contact_Info',
       'Message_Sent', 'Message_Content', 'Response', 'Clicked_Link', 'Purchase',
       'Campaign_ID', 'Timestamp', 'Status', 'Total_Targets', 'Contacted', 'Responses',
       'Clicks', 'Purchases', 'Success_Rate', 'Last_Update']
    ];
    
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A1:Z1`,
      valueInputOption: 'RAW',
      resource: { values: headers }
    });
    
    log.info('📝 تم إعداد عناوين الأعمدة');
  }

  async getProducts() {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A2:D1000`
    });
    
    return response.data.values || [];
  }

  async addTarget(data) {
    const row = [
      data.productName,      // A
      data.keywords,         // B
      data.productUrl,       // C
      data.region,           // D
      data.targetId,         // E
      data.platform,         // F
      data.username,         // G
      data.profileUrl,       // H
      data.intentScore,      // I
      data.contactMethod,    // J
      data.contactInfo,      // K
      new Date().toISOString(), // L: Message_Sent
      data.messageContent,   // M
      '',                    // N: Response
      'NO',                  // O: Clicked_Link
      'NO',                  // P: Purchase
      data.campaignId,       // Q
      new Date().toISOString(), // R: Timestamp
      data.status            // S: Status
    ];
    
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] }
    });
  }

  async updateStatistics(stats) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!T2:Z2`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [stats] }
    });
  }

  async updateTargetStatus(targetId, updates) {
    // البحث عن الصف وتحديثه
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!E2:S1000`
    });
    
    const rows = response.data.values || [];
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === targetId) { // العمود E هو Target_ID
        const rowIndex = i + 2; // +2 لأن الصف 1 للعناوين
        
        // تحديث الحقول المطلوبة
        const updatesToApply = {
          ...updates,
          timestamp: new Date().toISOString()
        };
        
        const range = `${this.sheetName}!N${rowIndex}:S${rowIndex}`;
        const values = [[
          updatesToApply.response || '',
          updatesToApply.clickedLink || 'NO',
          updatesToApply.purchase || 'NO',
          updatesToApply.campaignId || '',
          updatesToApply.timestamp,
          updatesToApply.status || ''
        ]];
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          resource: { values }
        });
        
        log.info(`🔄 تم تحديث الهدف ${targetId} إلى ${updatesToApply.status}`);
        break;
      }
    }
  }

  async getCurrentStats() {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!T2:Z2`
    });
    
    const values = response.data.values?.[0] || [];
    
    return {
      totalTargets: values[0] || 0,
      contacted: values[1] || 0,
      responses: values[2] || 0,
      clicks: values[3] || 0,
      purchases: values[4] || 0,
      successRate: values[5] || '0.00',
      lastUpdate: values[6] || 'Never'
    };
  }
}

module.exports = GoogleSheetsManager;
