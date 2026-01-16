from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Column
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB
import uuid


class Subscription(SQLModel, table=True):
    """
    Email subscription for grant notifications.
    Stores user preferences to match against new grants.
    """
    __tablename__ = "subscriptions"

    # Primary Key
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        description="Unique subscription ID"
    )
    
    # User Info
    email: str = Field(index=True, description="Subscriber email address")
    organization_name: str = Field(description="Name of the organization")
    
    # Preferences (mirrors search params from frontend)
    issue_area: str = Field(description="Main issue area or theme")
    scope_of_grant: str = Field(description="Detailed scope and objectives")
    kpis: List[str] = Field(
        sa_column=Column(JSONB), 
        default=[],
        description="Key Performance Indicators"
    )
    funding_quantum: float = Field(description="Desired funding amount")
    
    # Embedding for AI matching (768 dimensions for Gemini text-embedding-004)
    preference_embedding: Optional[List[float]] = Field(
        sa_column=Column(Vector(768)),
        default=None,
        description="Embedding of preferences for semantic matching"
    )
    
    # Status
    is_active: bool = Field(default=True, index=True, description="Whether subscription is active")
    
    # Tracking
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When subscription was created"
    )
    last_notified_at: Optional[datetime] = Field(
        default=None,
        description="Last time user was notified about grants"
    )
    
    class Config:
        arbitrary_types_allowed = True
