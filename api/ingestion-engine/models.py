from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB, TEXT
import json

class Grant(SQLModel, table=True):
    __tablename__ = "grants"

    # Primary Key and Metadata
    id: str = Field(primary_key=True, description="Unique ID or hash of the URL")
    name: str = Field(index=True)
    agency_name: str = Field(index=True)
    
    # The "Info" Link (Where we scraped from)
    original_url: str = Field(index=True, unique=True)
    
    # The "Apply" Link (extracted by AI)
    application_url: Optional[str] = Field(default=None)

    # --- HARD FILTERS (For SQL Checkboxes) ---
    # Fast filtering for: "Show me Sports grants for NPOs"
    applicant_types: List[str] = Field(sa_column=Column(JSONB), default=[]) # ["NPO", "SME"]
    sectors: List[str] = Field(sa_column=Column(JSONB), default=[]) # ["Sports", "Arts"]
    max_funding: Optional[int] = Field(default=None) 
    funding_percentage: Optional[float] = Field(default=None)
    
    # --- STATUS ---
    is_open: bool = Field(default=True, index=True) # Derived from closing_dates
    deadline: Optional[str] = Field(default=None) # e.g. "31 March 2026" or "Open"

    
    # --- INTELLIGENCE (For Display & Search) ---
    strategic_intent: Optional[str] = Field(sa_column=Column(TEXT), default=None) # "To boost digital adoption..."
    eligibility_summary: List[str] = Field(sa_column=Column(JSONB), default=[]) # ["Must be IPC", "2 years ops"]
    kpis: List[str] = Field(sa_column=Column(JSONB), default=[])
    
    # --- RAG CONTEXT (The Brain) ---
    # Markdown dump of HTML + PDF + Images
    full_text_context: str = Field(
        sa_column=Column(TEXT), 
        description="Merged content: HTML Text + Image OCR"
    )
    
    # --- ASSETS (For UI Cards) ---
    image_urls: List[str] = Field(sa_column=Column(JSONB), default=[])
    
    # --- SEARCH INDEX ---
    # 768 dimensions for Gemini text-embedding-004
    embedding: List[float] = Field(sa_column=Column(Vector(768)))
    
    class Config:
        arbitrary_types_allowed = True
