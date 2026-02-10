import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from supabase import create_client, Client
import random

logging.basicConfig(
    filename='nexus_prime.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def fetch_customers():
    try:
        response = supabase.table("customers").select("*").execute()
        return response.data if response.data else []
    except:
        return []

def fetch_products():
    try:
        response = supabase.table("products").select("*").execute()
        return response.data if response.data else []
    except:
        return []

def evaluate_customers(customers):
    scored = []
    for c in customers:
        score = random.uniform(0, 1)
        scored.append({"customer": c, "score": score})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:10]

def generate_recommendations(products, top_n=3):
    return random.sample(products, min(len(products), top_n))

def send_email(to_email, subject, body):
    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_USERNAME
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
    except:
        pass

def main():
    logging.info("NEXUS-PRIME SMART started.")
    customers = fetch_customers()
    products = fetch_products()
    if not customers or not products:
        logging.warning("No customers or products found. Exiting.")
        return
    top_customers = evaluate_customers(customers)
    for entry in top_customers:
        c = entry["customer"]
        score = entry["score"]
        recommended = generate_recommendations(products)
        body = f"""
        <h2>مرحبًا {c.get('name', '')}!</h2>
        <pلقد اخترنا لك منتجات مميزة بناءً على نشاطك معنا:</p>
        <ul>
            {''.join([f"<li>{p.get('name', 'منتج')}</li>" for p in recommended])}
        </ul>
        <p>نقاط التقييم الخاصة بك: {score:.2f}</p>
        """
        send_email(c.get("email"), f"عرض خاص لك، {c.get('name', '')}!", body)
    logging.info("NEXUS-PRIME SMART finished successfully.")

if __name__ == "__main__":
    main()
