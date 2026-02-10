import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    
    # APIs
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    GOOGLE_CX = os.getenv("GOOGLE_CX")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Twitter
    TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
    TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
    TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
    TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")
    
    # LinkedIn
    LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
    LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
    LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN")
    
    # Email
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    
    # System
    MAX_CONCURRENT_CAMPAIGNS = int(os.getenv("MAX_CONCURRENT_CAMPAIGNS", 3))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 30))
    RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", 20))
    ANALYSIS_MODEL = os.getenv("ANALYSIS_MODEL", "gpt-4-turbo-preview")
    
    # Paths
    LOG_DIR = "logs"
    DATA_DIR = "data"
    TEMPLATES_DIR = "templates"
    
    @classmethod
    def validate(cls):
        required_vars = [
            'SUPABASE_URL', 'SUPABASE_KEY', 'OPENAI_API_KEY'
        ]
        missing = [var for var in required_vars if not getattr(cls, var)]
        if missing:
            raise ValueError(f"Missing required environment variables: {missing}")

settings = Settings()
