const { google } = require('googleapis');

class GoogleSheets {
  constructor() {
    this.client = null;
    this.sheetId = process.env.GOOGLE_SHEETS_ID;
    this.sheetName = 'Kony_Campaign_Tracker';
  }

  async connect() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.client = google.sheets({ version: 'v4', auth });
    console.log('Connected to Google Sheets');
  }

  async getProducts() {
    const response = await this.client.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${this.sheetName}!A2:D1000`
    });

    const rows = response.data.values || [];
    
    return rows.map((row, index) => ({
      id: `P-${index + 1}`,
      name: row[0] || '',
      keywords: (row[1] || '').split(',').map(k => k.trim()),
      url: row[2] || '',
      region: row[3] || 'global'
    })).filter(p => p.name && p.url);
  }

  async recordTarget(data) {
    const row = [
      data.productId,
      data.targetId,
      data.platform,
      data.username,
      data.profileUrl,
      data.intentScore,
      data.contactMethod,
      data.messageContent.substring(0, 100),
      data.trackingLink,
      data.status,
      data.timestamp
    ];

    await this.client.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `${this.sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] }
    });
  }

  async updateStats(stats) {
    const values = [
      [
        stats.totalTargets,
        stats.contacted,
        stats.responses,
        stats.clicks,
        stats.purchases,
        stats.revenue,
        stats.lastUpdate
      ]
    ];

    await this.client.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: `${this.sheetName}!T2:Z2`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  }

  async updateTargetStatus(targetId, status, updates = {}) {
    // Find and update target row
    const response = await this.client.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${this.sheetName}!A2:K1000`
    });

    const rows = response.data.values || [];
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][1] === targetId) {
        const rowIndex = i + 2;
        
        const updateRange = `${this.sheetName}!J${rowIndex}:K${rowIndex}`;
        const updateValues = [[
          status,
          new Date().toISOString()
        ]];
        
        await this.client.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: updateRange,
          valueInputOption: 'USER_ENTERED',
          resource: { values: updateValues }
        });
        
        break;
      }
    }
  }
}

module.exports = GoogleSheets;
