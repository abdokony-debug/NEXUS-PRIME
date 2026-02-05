name: WAHAB System Debug
on: workflow_dispatch

jobs:
  debug:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install axios@^1.6.0 googleapis@^128.0.0 playwright@^1.40.0 dotenv@^16.3.1
          npx playwright install chromium
      
      - name: Debug - Check src/index.js
        run: |
          echo "=== Debug: Analyzing src/index.js ==="
          
          if [ ! -f "src/index.js" ]; then
            echo "❌ ERROR: src/index.js not found!"
            exit 1
          fi
          
          echo "File exists, size: $(wc -l < src/index.js) lines"
          echo "First 20 lines of src/index.js:"
          echo "--------------------------------"
          head -20 src/index.js
          echo "--------------------------------"
          
          echo "Checking for syntax errors..."
          node --check src/index.js && echo "✅ No syntax errors found" || echo "❌ Syntax errors detected"
      
      - name: Debug - Create test script
        run: |
          echo "=== Creating test script ==="
          cat > test-run.js << 'EOF'
          console.log("=== WAHAB System Test ===");
          
          // Test 1: Check Node.js environment
          console.log("1. Node version:", process.version);
          
          // Test 2: Check required modules
          try {
            const axios = require('axios');
            console.log("2. ✅ axios loaded");
          } catch (e) { console.log("2. ❌ axios error:", e.message); }
          
          try {
            const { google } = require('googleapis');
            console.log("3. ✅ googleapis loaded");
          } catch (e) { console.log("3. ❌ googleapis error:", e.message); }
          
          try {
            const { chromium } = require('playwright');
            console.log("4. ✅ playwright loaded");
          } catch (e) { console.log("4. ❌ playwright error:", e.message); }
          
          // Test 3: Check environment variables
          console.log("5. GOOGLE_SHEET_URL:", process.env.GOOGLE_SHEET_URL ? "✅ Set" : "❌ Missing");
          console.log("5. GOOGLE_CLIENT_EMAIL:", process.env.GOOGLE_CLIENT_EMAIL ? "✅ Set" : "❌ Missing");
          console.log("5. GOOGLE_PRIVATE_KEY:", process.env.GOOGLE_PRIVATE_KEY ? "✅ Set (first 50 chars)" : "❌ Missing");
          
          console.log("=== Test completed ===");
          EOF
          
          echo "Test script created. Running..."
          node test-run.js
      
      - name: Debug - Execute with error capture
        id: execute
        continue-on-error: true
        run: |
          echo "=== Executing src/index.js with error handling ==="
          
          # Create a wrapper to catch errors
          cat > wrapper.js << 'EOF'
          try {
            console.log("🚀 Loading src/index.js...");
            require('./src/index.js');
            console.log("✅ src/index.js executed without throwing errors");
          } catch (error) {
            console.error("❌ ERROR in src/index.js:");
            console.error("Message:", error.message);
            console.error("Stack:", error.stack);
            console.error("Error type:", error.constructor.name);
            process.exit(1);
          }
          EOF
          
          # Run the wrapper
          node wrapper.js --mode platforms --batch-size 5 2>&1 | tee execution.log
          
          # Check exit code
          EXIT_CODE=${PIPESTATUS[0]}
          echo "Exit code: $EXIT_CODE"
          
          if [ $EXIT_CODE -eq 0 ]; then
            echo "✅ Execution successful"
          else
            echo "❌ Execution failed"
            echo "=== Last 50 lines of output ==="
            tail -50 execution.log
          fi
          
          exit $EXIT_CODE
        env:
          GOOGLE_SHEET_URL: ${{ secrets.GOOGLE_SHEET_URL }}
          GOOGLE_CLIENT_EMAIL: ${{ secrets.GOOGLE_CLIENT_EMAIL }}
          GOOGLE_PRIVATE_KEY: ${{ secrets.GOOGLE_PRIVATE_KEY }}
          NODE_ENV: production
      
      - name: Final report
        if: always()
        run: |
          echo "=== FINAL REPORT ==="
          echo "Workflow status: ${{ job.status }}"
          echo "Run ID: ${{ github.run_id }}"
          echo "View logs: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          
          if [ "${{ job.status }}" = "success" ]; then
            echo "🎉 System is working correctly!"
          else
            echo "🔧 System needs debugging"
            echo "Check the 'Debug - Execute with error capture' step for detailed error messages"
          fi
