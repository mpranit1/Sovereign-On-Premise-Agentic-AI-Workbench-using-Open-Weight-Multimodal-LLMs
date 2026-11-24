import os
from pathlib import Path
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
DOCUMENTS_DIR = STORAGE_DIR / "documents"
EXPORTS_DIR = STORAGE_DIR / "exports"

for d in [STORAGE_DIR, UPLOADS_DIR, DOCUMENTS_DIR, EXPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "Sovereign AI Workbench"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: os.getenv("SAW_SECRET_KEY", "sovereign-workbench-super-secret-key-change-in-production-2026"))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database
    DATABASE_URL: str = Field(default_factory=lambda: os.getenv(
        "DATABASE_URL", 
        f"sqlite+aiosqlite:///{STORAGE_DIR.as_posix()}/workbench.db"
    ))
    
    # Model runtime endpoints
    OLLAMA_BASE_URL: str = Field(default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
    VLLM_BASE_URL: str = Field(default_factory=lambda: os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1"))
    LLAMACPP_BASE_URL: str = Field(default_factory=lambda: os.getenv("LLAMACPP_BASE_URL", "http://localhost:8080/v1"))
    DEFAULT_MODEL_ID: str = Field(default_factory=lambda: os.getenv("DEFAULT_MODEL_ID", "default-local-model"))
    
    # Storage Paths
    STORAGE_DIR: Path = STORAGE_DIR
    UPLOADS_DIR: Path = UPLOADS_DIR
    DOCUMENTS_DIR: Path = DOCUMENTS_DIR
    EXPORTS_DIR: Path = EXPORTS_DIR
    
    # Sandboxing & Safety
    MAX_FILE_SIZE_MB: int = 50
    ALLOW_CODE_EXECUTION: bool = True
    AIR_GAPPED_MODE: bool = True

settings = Settings()
