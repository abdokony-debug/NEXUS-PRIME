name: NEXUS-PRIME Engine

on:
  workflow_dispatch:  # زر التشغيل اليدوي
  schedule:
    - cron: '0 */6 * * *'  # تشغيل تلقائي كل 6 ساعات

jobs:
  run_marketing_system:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 تحميل الكود
        uses: actions/checkout@v4

      - name: 🐍 إعداد بايثون
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: 📦 تثبيت المكتبات
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt

      - name: 🚀 تشغيل النظام
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: python main.py
