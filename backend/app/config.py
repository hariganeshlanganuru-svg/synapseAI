import os

def load_dotenv_file(filepath: str):
    """Simple parser to load .env key-values into os.environ without requiring third-party libraries."""
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    os.environ[key] = val

# Auto-load .env from current directory or parent directory
load_dotenv_file(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv_file(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "SynapseAI Enterprise Backend")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    
    # Storage & DB
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./synapseai.db")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Vector DB & LLM Settings
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "synapseai-index")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # SMTP Email Credentials
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "admin@synapseai.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "secret")
    
    # Local Standalone Fallback Flag
    ENABLE_LOCAL_FALLBACK: bool = os.getenv("ENABLE_LOCAL_FALLBACK", "True").lower() in ("true", "1", "t")

settings = Settings()
