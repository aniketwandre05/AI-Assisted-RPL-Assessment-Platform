import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    PROJECT_NAME = "AI-Assisted RPL Assessment Platform (SIH26242)"
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-secret-key-sih26242")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'rpl_assessment.db'}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Uploads & Evidence
    UPLOAD_FOLDER = BASE_DIR / "data" / "uploads"
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
    
    # Report & Data dirs
    REPORTS_DIR = BASE_DIR / "data" / "reports"
    REFERENCES_DIR = BASE_DIR / "References"
    NQR_EXCEL_PATH = BASE_DIR / "Data_Qualification_Register_11-Oct-2026.xlsx"
