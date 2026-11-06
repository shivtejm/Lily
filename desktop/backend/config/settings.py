import os
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

def load_env():
    if ENV_PATH.exists():
        with open(ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()

load_env()

class Settings:
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    # OpenAI (Backup)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    USE_OLLAMA: bool = os.getenv("USE_OLLAMA", "false").lower() == "true"
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Server
    WEB_PORT: int = int(os.getenv("WEB_PORT", "8000"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Database
    DB_PATH: Path = BASE_DIR / "db" / "lily.db"
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://ljsplbvytqmqbyzwhmhrn.supabase.co")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcGxidnl0cW1xYnl6d21ocmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzc3MTUsImV4cCI6MjA5MDgxMzcxNX0.itLzJ6eLt8911Z2xTcIPuL1QnVS3Sj-ulzUN1gRRPfk")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcGxidnl0cW1xYnl6d21ocmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNzcxNSwiZXhwIjoyMDkwODEzNzE1fQ.-y307kH2cXGfpiqQ-h1-vcWfWWW8euusWH0zX3bahy8")

settings = Settings()