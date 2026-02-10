FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV AUTO_MODE=true
ENV OPENAI_API_KEY=your_openai_key
ENV GROQ_API_KEY=your_groq_key
ENV SUPABASE_URL=your_supabase_url
ENV SUPABASE_SERVICE_KEY=your_supabase_key
ENV DISCORD_TOKEN=your_discord_webhook
ENV GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'
ENV GOOGLE_SHEET_ID=your_sheet_id
ENV GOOGLE_SHEET_NAME=Sheet1

CMD ["python", "main.py"]
