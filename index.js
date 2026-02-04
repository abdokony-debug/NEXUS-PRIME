name: Wahab Prime System
on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  execution_core:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Codebase
        uses: actions/checkout@v4

      - name: Setup Node.js Environment
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install System Arsenal
        run: |
          npm install
          npx playwright install --with-deps chromium

      - name: Execute Prime Mission
        run: node index.js
        env:
          SHEET_URL: ${{ secrets.SHEET_URL }}

      - name: Archive Intelligence Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: Intelligence-Report
          path: evidences/
