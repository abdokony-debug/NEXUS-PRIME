
// WAHAB System - Real Referral Platform Processor
const { google } = require('googleapis');
const { chromium } = require('playwright');

console.log("🚀 =========================================");
console.log("🚀 WAHAB Referral System - REAL PROCESSING");
console.log("🚀 =========================================");

async function main() {
  try {
    console.log("📅 " + new Date().toISOString());
    
    // Get arguments
    const args = process.argv.slice(2);
    const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'platforms';
    const batchSize = args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 5;
    
    console.log(`⚙️ Mode: ${mode}, Batch: ${batchSize}`);
    
    // === 1. VALIDATE ENVIRONMENT ===
    console.log("\n🔍 Validating environment...");
    const requiredVars = ['GOOGLE_SHEET_URL', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
    for (const envVar of requiredVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing environment variable: ${envVar}`);
      }
    }
    console.log("✅ Environment OK");
    
    // === 2. EXTRACT SPREADSHEET ID ===
    console.log("\n📊 Extracting spreadsheet ID...");
    const sheetUrl = process.env.GOOGLE_SHEET_URL;
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error('Invalid Google Sheets URL');
    const spreadsheetId = match[1];
    console.log(`✅ Spreadsheet ID: ${spreadsheetId}`);
    
    // === 3. INITIALIZE GOOGLE SHEETS ===
    console.log("\n🔗 Connecting to Google Sheets...");
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    
    // Test connection
    try {
      const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
      console.log(`✅ Connected to: "${sheetInfo.data.properties.title}"`);
    } catch (error) {
      console.error("❌ Google Sheets connection failed:", error.message);
      throw error;
    }
    
    // === 4. READ REFERRAL PLATFORMS ===
    console.log("\n📖 Reading referral platforms from sheet...");
    
    // Read columns A to D (Platform_Name, Link_URL, Added_Count, Status)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:D',
    });
    
    const rows = response.data.values || [];
    console.log(`📊 Total rows in sheet: ${rows.length}`);
    
    if (rows.length === 0) {
      console.log("✅ No data to process");
      process.exit(0);
    }
    
    // Parse platforms (skip header if exists)
    const platforms = [];
    const hasHeader = rows[0] && (
      rows[0][0]?.toLowerCase().includes('platform') || 
      rows[0][1]?.toLowerCase().includes('link')
    );
    
    const startRow = hasHeader ? 1 : 0;
    
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      const platform = {
        rowNumber: i + 1,
        name: row[0] || `Platform_${i}`,
        url: row[1] || '',
        count: parseInt(row[2]) || 0,
        status: row[3] || ''
      };
      
      // Only include platforms with valid URLs
      if (platform.url && platform.url.startsWith('http')) {
        platforms.push(platform);
      }
    }
    
    console.log(`✅ Found ${platforms.length} valid platforms`);
    
    // Filter to pending platforms
    const pendingPlatforms = platforms
      .filter(p => !p.status || p.status === '' || p.status === 'PENDING')
      .slice(0, batchSize);
    
    console.log(`🔄 Processing ${pendingPlatforms.length} pending platforms`);
    
    if (pendingPlatforms.length === 0) {
      console.log("✅ No pending platforms to process");
      process.exit(0);
    }
    
    // === 5. LAUNCH BROWSER ===
    console.log("\n🌐 Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log("✅ Browser ready");
    
    // === 6. PROCESS EACH PLATFORM ===
    console.log("\n" + "=".repeat(50));
    console.log("🔄 STARTING PROCESSING");
    console.log("=".repeat(50));
    
    const results = [];
    
    for (const platform of pendingPlatforms) {
      console.log(`\n📍 Processing: ${platform.name}`);
      console.log(`   🔗 URL: ${platform.url}`);
      console.log(`   📍 Row: ${platform.rowNumber}`);
      
      const result = {
        platform: platform.name,
        success: false,
        message: '',
        finalUrl: '',
        statusCode: null
      };
      
      try {
        // Navigate to the platform
        console.log(`   🌐 Visiting...`);
        const response = await page.goto(platform.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        result.statusCode = response?.status();
        result.finalUrl = page.url();
        
        if (result.statusCode >= 400) {
          throw new Error(`HTTP ${result.statusCode}`);
        }
        
        // Get page info
        const title = await page.title();
        console.log(`   📝 Title: ${title.substring(0, 60)}...`);
        console.log(`   🔗 Final URL: ${result.finalUrl}`);
        
        // Check for referral indicators
        const pageContent = await page.content();
        const referralIndicators = ['referral', 'invite', 'sign up', 'register', 'join', 'earn'];
        const foundIndicators = referralIndicators.filter(indicator => 
          pageContent.toLowerCase().includes(indicator)
        );
        
        if (foundIndicators.length > 0) {
          console.log(`   🔍 Found referral indicators: ${foundIndicators.join(', ')}`);
        }
        
        // Check for signup form
        const hasSignupForm = await page.$('input[type="email"], input[name*="email"], form[action*="signup"]') !== null;
        if (hasSignupForm) {
          console.log(`   👤 Sign-up form detected`);
        }
        
        result.success = true;
        result.message = `Visited successfully. ${hasSignupForm ? 'Sign-up form detected.' : ''}`;
        console.log(`   ✅ Success`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        result.message = `Error: ${error.message}`;
        result.success = false;
      }
      
      results.push(result);
      
      // Update Google Sheets status
      try {
        const status = result.success ? 'VISITED' : 'FAILED';
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `D${platform.rowNumber}`,
          valueInputOption: 'RAW',
          resource: { values: [[status]] }
        });
        
        // Add notes in column E
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `E${platform.rowNumber}`,
          valueInputOption: 'RAW',
          resource: { values: [[result.message.substring(0, 100)]] }
        });
        
        console.log(`   📤 Updated sheet status: ${status}`);
        
      } catch (updateError) {
        console.log(`   ⚠️ Could not update sheet: ${updateError.message}`);
      }
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // === 7. CLEANUP ===
    console.log("\n🧹 Cleaning up...");
    await browser.close();
    console.log("✅ Browser closed");
    
    // === 8. GENERATE REPORT ===
    console.log("\n" + "=".repeat(50));
    console.log("📊 PROCESSING REPORT");
    console.log("=".repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total Processed: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${(successful / results.length * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log("\n❌ Failed platforms:");
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.platform}: ${r.message}`);
      });
    }
    
    console.log("\n✅ Successful platforms:");
    results.filter(r => r.success).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.platform}`);
      console.log(`     URL: ${r.finalUrl}`);
      if (r.statusCode) console.log(`     Status: ${r.statusCode}`);
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 WAHAB SYSTEM COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    
    process.exit(0);
    
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("❌ SYSTEM FAILED!");
    console.error("=".repeat(50));
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Run the system
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
