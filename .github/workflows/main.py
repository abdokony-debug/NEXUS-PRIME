name: NEXUS-PRIME Smart Automation

on:
  workflow_dispatch:   # تشغيل يدوي
  schedule:
    - cron: "0 */6 * * *"   # كل 6 ساعات (عدل حسب رغبتك)

jobs:
  nexus-prime:
    runs-on: ubuntu-latest
    timeout-minutes: 120

    env:
      AUTO_MODE: "true"
      PYTHONUNBUFFERED: "1"

      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}

      GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
      GOOGLE_CX: ${{ secrets.GOOGLE_CX }}

      SMTP_SERVER: ${{ secrets.SMTP_SERVER }}
      SMTP_PORT: ${{ secrets.SMTP_PORT }}
      SMTP_USERNAME: ${{ secrets.SMTP_USERNAME }}
      SMTP_PASSWORD: ${{ secrets.SMTP_PASSWORD }}

    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: 🐍 Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: 📦 Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: 🧠 Run NEXUS-PRIME SMART
        run: |
          python nexus_prime_smart.py

      - name: 📊 Upload logs (optional)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: nexus-prime-logs
          path: |
            *.log
