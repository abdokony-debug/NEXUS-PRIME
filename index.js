// WAHAB System - Referral Platforms Processor
const { google } = require('googleapis');
const { chromium } = require('playwright');

console.log("🚀 =============================================");
console.log("🚀 WAHAB System - Referral Platforms Processor");
console.log("🚀 =============================================");

class ReferralProcessor {
  constructor() {
    this.spreadsheetId = null;
    this.sheetsAPI = null;
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async initialize() {
    try {
      console.log("🔧 Initializing system...");
      
      // Validate environment variables
      this.validateEnvironment();
      
      // Extract spreadsheet ID from URL
      this.extractSpreadsheetId();
      
      // Initialize Google Sheets API
      await this.initializeGoogleSheets();
      
      // Launch browser
      await this.launchBrowser();
      
      console.log("✅ System initialization completed");
      return true;
    } catch (error) {
      console.error("❌ System initialization failed:", error.message);
      throw error;
    }
  }

  validateEnvironment() {
    console.log("🔍 Validating environment variables...");
    
    const requiredEnvVars = [
      'GOOGLE_SHEET_URL',
      'GOOGLE_CLIENT_EMAIL', 
      'GOOGLE_PRIVATE_KEY'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
    
    console.log("✅ Environment variables validated");
  }

  extractSpreadsheetId() {
    const url = process.env.GOOGLE_SHEET_URL;
    console.log(`📊 Google Sheet URL: ${url}`);
    
    // Extract ID from different URL formats
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        this.spreadsheetId = match[1];
        console.log(`✅ Extracted Spreadsheet ID: ${this.spreadsheetId}`);
        return;
      }
    }
    
    throw new Error('Cannot extract Spreadsheet ID from URL');
  }

  async initializeGoogleSheets() {
    console.log("🔗 Initializing Google Sheets API...");
    
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheetsAPI = google.sheets({ 
        version: 'v4', 
        auth: await auth.getClient() 
      });

      // Test connection
      const response = await this.sheetsAPI.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      console.log(`✅ Connected to spreadsheet: "${response.data.properties.title}"`);
      console.log(`📄 Sheets: ${response.data.sheets.map(s => s.properties.title).join(', ')}`);
      
    } catch (error) {
      console.error("❌ Google Sheets API error:", error.message);
      throw error;
    }
  }

  async launchBrowser() {
    console.log("🌐 Launching browser...");
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set realistic headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log("✅ Browser launched");
  }

  async readPlatformsFromSheet() {
    console.log("📖 Reading platforms from sheet...");
    
    try {
      // Read all columns (A, B, C, D)
      const range = 'A:D';
      const response = await this.sheetsAPI.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const rows = response.data.values || [];
      
      if (rows.length === 0) {
        console.log("⚠️ No data found in sheet");
        return [];
      }

      console.log(`📊 Found ${rows.length} rows in sheet`);

      // Parse rows - skip header if exists
      const platforms = [];
      const isHeaderRow = rows[0][0]?.toLowerCase().includes('platform') || 
                         rows[0][1]?.toLowerCase().includes('link');
      
      const startRow = isHeaderRow ? 1 : 0;
      
      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        const platform = {
          rowNumber: i + 1,
          platformName: row[0] || `Platform_${i}`,
          linkUrl: row[1] || '',
          addedCount: parseInt(row[2]) || 0,
          status: row[3] || '',
          processed: false,
          result: null
        };

        // Only process rows with valid URLs
        if (platform.linkUrl && platform.linkUrl.startsWith('http')) {
          platforms.push(platform);
        } else if (platform.linkUrl) {
          console.log(`⚠️ Invalid URL in row ${platform.rowNumber}: ${platform.linkUrl}`);
        }
      }

      console.log(`✅ Extracted ${platforms.length} valid platforms`);
      return platforms;

    } catch (error) {
      console.error("❌ Error reading from Google Sheets:", error.message);
      throw error;
    }
  }

  async processPlatform(platform) {
    console.log(`\n🔄 Processing: ${platform.platformName}`);
    console.log(`   🔗 URL: ${platform.linkUrl}`);
    console.log(`   📍 Row: ${platform.rowNumber}`);
    
    const result = {
      success: false,
      platformName: platform.platformName,
      originalUrl: platform.linkUrl,
      finalUrl: null,
      statusCode: null,
      error: null,
      actionsTaken: [],
      dataExtracted: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Navigate to the referral link
      console.log(`   🌐 Navigating to referral link...`);
      const response = await this.page.goto(platform.linkUrl, {
        waitUntil: 'networkidle',
        timeout: 45000
      });

      const status = response?.status();
      result.statusCode = status;
      result.finalUrl = this.page.url();
      
      console.log(`   📊 Status: ${status}`);
      console.log(`   🔗 Final URL: ${result.finalUrl}`);

      if (status >= 400) {
        throw new Error(`HTTP ${status} - Page not accessible`);
      }

      // Get page information
      const pageTitle = await this.page.title();
      const currentUrl = this.page.url();
      
      console.log(`   📝 Title: ${pageTitle.substring(0, 60)}...`);
      
      result.dataExtracted.title = pageTitle;
      result.dataExtracted.currentUrl = currentUrl;

      // Check for common referral platform patterns
      await this.checkForReferralPatterns(result);

      // Check for sign-up/login forms
      const hasSignupForm = await this.checkForSignupForm();
      
      if (hasSignupForm) {
        console.log(`   👤 Sign-up form detected`);
        result.actionsTaken.push('signup_form_detected');
        
        // Try to interact with common signup forms
        await this.interactWithSignupForm(result);
      }

      // Check for account creation/registration
      const hasAccountCreation = await this.checkForAccountCreation();
      if (hasAccountCreation) {
        console.log(`   📝 Account creation detected`);
        result.actionsTaken.push('account_creation_detected');
      }

      // Check if it's a referral link (look for referral codes in URL)
      const isReferralLink = await this.verifyReferralLink(platform.linkUrl, currentUrl);
      result.dataExtracted.isReferralLink = isReferralLink;
      
      if (isReferralLink) {
        console.log(`   ✅ Verified as referral link`);
        result.actionsTaken.push('referral_verified');
      }

      // Extract additional data
      await this.extractPlatformData(result);

      result.success = true;
      console.log(`   ✅ Processing completed successfully`);

    } catch (error) {
      console.error(`   ❌ Error processing platform: ${error.message}`);
      result.error = error.message;
      result.success = false;
    }

    platform.processed = true;
    platform.result = result;
    this.results.push(result);
    
    return result;
  }

  async checkForReferralPatterns(result) {
    // Look for common referral-related text on page
    const referralKeywords = [
      'referral', 'invite', 'invitation', 'friend', 
      'share', 'earn', 'bonus', 'reward', 'credit',
      'sign up', 'register', 'join', 'get started'
    ];
    
    const pageText = await this.page.content();
    const foundKeywords = referralKeywords.filter(keyword => 
      pageText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      result.dataExtracted.referralKeywords = foundKeywords;
      console.log(`   🔍 Found referral keywords: ${foundKeywords.join(', ')}`);
    }
  }

  async checkForSignupForm() {
    const signupSelectors = [
      'input[type="email"]',
      'input[name*="email"]',
      '#email',
      'input[type="text"][name*="user"]',
      'form[action*="signup"]',
      'form[action*="register"]',
      'form[action*="join"]',
      'button:has-text("Sign Up")',
      'button:has-text("Register")',
      'button:has-text("Join")',
      'a:has-text("Sign Up")',
      'a:has-text("Register")'
    ];
    
    for (const selector of signupSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  }

  async interactWithSignupForm(result) {
    // This is a simplified interaction - in real system, you'd need specific logic
    // for each platform
    
    try {
      // Try to find email field
      const emailSelectors = [
        'input[type="email"]',
        'input[name*="email"]',
        '#email',
        'input[placeholder*="email"]'
      ];
      
      for (const selector of emailSelectors) {
        try {
          const emailField = await this.page.$(selector);
          if (emailField) {
            console.log(`   ✍️ Found email field with selector: ${selector}`);
            result.actionsTaken.push('email_field_found');
            
            // Note: In real implementation, you would fill with appropriate email
            // await emailField.fill('test@example.com');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Check for password field
      const passwordSelectors = [
        'input[type="password"]',
        'input[name*="password"]',
        '#password',
        'input[placeholder*="password"]'
      ];
      
      for (const selector of passwordSelectors) {
        try {
          const passwordField = await this.page.$(selector);
          if (passwordField) {
            console.log(`   🔐 Found password field with selector: ${selector}`);
            result.actionsTaken.push('password_field_found');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
    } catch (error) {
      console.log(`   ⚠️ Could not interact with form: ${error.message}`);
    }
  }

  async checkForAccountCreation() {
    const accountSelectors = [
      'input[name*="username"]',
      'input[name*="name"]',
      '#username',
      'input[placeholder*="username"]',
      'input[placeholder*="name"]'
    ];
    
    for (const selector of accountSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  }

  async verifyReferralLink(originalUrl, finalUrl) {
    // Check if URL contains referral patterns
    const referralPatterns = [
      /\/r\//,
      /\/ref\//,
      /referral=/,
      /code=/,
      /invite=/,
      /refcode=/,
      /referralcode=/
    ];
    
    for (const pattern of referralPatterns) {
      if (pattern.test(originalUrl) || pattern.test(finalUrl)) {
        return true;
      }
    }
    
    return false;
  }

  async extractPlatformData(result) {
    try {
      // Extract meta description
      const description = await this.page.$eval('meta[name="description"]', el => el.content)
        .catch(() => null);
      
      if (description) {
        result.dataExtracted.description = description.substring(0, 200);
      }
      
      // Extract h1 headings
      const h1Texts = await this.page.$$eval('h1', elements => 
        elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
      ).catch(() => []);
      
      if (h1Texts.length > 0) {
        result.dataExtracted.mainHeadings = h1Texts;
      }
      
      // Check for platform-specific elements
      const platformIndicators = {
        hasLoginButton: await this.page.$('button:has-text("Log In"), a:has-text("Log In")') !== null,
        hasSignupButton: await this.page.$('button:has-text("Sign Up"), a:has-text("Sign Up")') !== null,
        hasDashboard: await this.page.$('*:has-text("Dashboard"), *:has-text("My Account")') !== null,
        hasEarnings: await this.page.$('*:has-text("Earnings"), *:has-text("Rewards")') !== null
      };
      
      result.dataExtracted.platformIndicators = platformIndicators;
      
    } catch (error) {
      // Silently continue if extraction fails
    }
  }

  async updateSheetResults(platforms) {
    console.log("\n📤 Updating Google Sheets with results...");
    
    try {
      const updates = [];
      
      for (const platform of platforms) {
        if (platform.processed && platform.result) {
          const status = platform.result.success ? 'PROCESSED' : 'FAILED';
          const notes = platform.result.success ? 
            `Visited: ${platform.result.finalUrl}` : 
            `Error: ${platform.result.error}`;
          
          updates.push({
            range: `D${platform.rowNumber}`,
            values: [[status]]
          });
          
          // Optional: Add notes in a new column (E)
          updates.push({
            range: `E${platform.rowNumber}`,
            values: [[notes]]
          });
        }
      }
      
      if (updates.length === 0) {
        console.log("⚠️ No updates to apply");
        return;
      }
      
      // Batch update
      await this.sheetsAPI.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: updates
        }
      });
      
      console.log(`✅ Updated ${updates.length / 2} rows in Google Sheets`);
      
    } catch (error) {
      console.error("❌ Failed to update sheet:", error.message);
    }
  }

  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 PROCESSING REPORT");
    console.log("=".repeat(60));
    
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`Total Platforms Processed: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${total > 0 ? ((successful / total) * 100).toFixed(1) : 0}%`);
    
    if (failed > 0) {
      console.log("\n❌ Failed Platforms:");
      this.results.filter(r => !r.success).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.platformName}: ${result.error}`);
      });
    }
    
    console.log("\n✅ Successful Platforms:");
    this.results.filter(r => r.success).forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.platformName}`);
      console.log(`     URL: ${result.finalUrl}`);
      console.log(`     Status: ${result.statusCode}`);
      if (result.actionsTaken.length > 0) {
        console.log(`     Actions: ${result.actionsTaken.join(', ')}`);
      }
    });
    
    console.log("\n" + "=".repeat(60));
  }

  async cleanup() {
    console.log("\n🧹 Cleaning up resources...");
    
    if (this.browser) {
      await this.browser.close();
      console.log("✅ Browser closed");
    }
    
    console.log("✅ Cleanup completed");
  }

  async processBatch(batchSize = 5) {
    console.log(`\n🎯 Processing batch (size: ${batchSize})`);
    
    try {
      // Read platforms from sheet
      const allPlatforms = await this.readPlatformsFromSheet();
      
      if (allPlatforms.length === 0) {
        console.log("✅ No platforms to process");
        return { processed: 0, successful: 0, failed: 0 };
      }

      // Filter platforms that need processing (empty or pending status)
      const platformsToProcess = allPlatforms
        .filter(p => !p.status || p.status === '' || p.status.toUpperCase() === 'PENDING')
        .slice(0, batchSize);

      console.log(`🔄 Processing ${platformsToProcess.length} platforms`);

      // Process each platform
      for (const platform of platformsToProcess) {
        await this.processPlatform(platform);
        
        // Delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Update Google Sheets with results
      await this.updateSheetResults(platformsToProcess);
      
      // Generate report
      this.generateReport();

      return {
        processed: platformsToProcess.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      };

    } catch (error) {
      console.error("❌ Batch processing failed:", error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log("🕐 " + new Date().toISOString());
  
  const args = process.argv.slice(2);
  const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'platforms';
  const batchSize = args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 5;
  
  console.log(`⚙️ Mode: ${mode}, Batch Size: ${batchSize}`);
  
  const processor = new ReferralProcessor();
  
  try {
    // Initialize system
    await processor.initialize();
    
    // Run processing
    const results = await processor.processBatch(batchSize);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 WAHAB SYSTEM - REFERRAL PROCESSING COMPLETED!");
    console.log("=".repeat(60));
    
    process.exit(0);
    
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ SYSTEM FAILED!");
    console.error("=".repeat(60));
    console.error("Error:", error.message);
    
    process.exit(1);
  } finally {
    // Always cleanup
    await processor.cleanup();
  }
}

// Run the system
if (require.main === module) {
  main().catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
