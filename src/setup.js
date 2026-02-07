const fs = require('fs');
const path = require('path');

function setupProject() {
  console.log('Setting up Kony Marketing project...');
  
  const files = {
    'package.json': `{
  "name": "kony-marketing",
  "version": "1.0.0",
  "description": "Kony Marketing Automation System",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "setup": "node setup.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.0",
    "googleapis": "^128.0.0"
  }
}`,
    
    '.gitignore': `node_modules/
.env
*.log
.DS_Store
.vscode/
coverage/`,
    
    'env.example': `GOOGLE_SHEETS_ID=your_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

KONY_MODE=standard
KONY_BATCH_SIZE=10
KONY_REGION=global

NODE_ENV=production`
  };
  
  Object.entries(files).forEach(([filename, content]) => {
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, content);
      console.log(`Created ${filename}`);
    }
  });
  
  console.log('Setup complete. Run: npm install && npm start');
}

if (require.main === module) {
  setupProject();
}
