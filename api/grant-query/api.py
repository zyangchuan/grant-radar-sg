"""
api.py - FastAPI with Streaming Progress Updates
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, AsyncGenerator
import json
import asyncio
from datetime import datetime

# Import our AI service
from grant_service import find_and_evaluate_grants, find_and_evaluate_grants_streaming, embeddings
from database import get_session, init_db
from models import Grant, Organization
from subscription_model import Subscription
from sqlmodel import select
from sqlalchemy import text
from fastapi import Depends
from auth import get_current_user

# ==========================================
# PYDANTIC MODELS
# ==========================================
class ProjectRequirements(BaseModel):
    issue_area: str = Field(..., description="Main issue area or theme of the project")
    scope_of_grant: str = Field(..., description="Detailed scope and objectives of the grant")
    kpis: List[str] = Field(..., description="Key Performance Indicators for the project")
    funding_quantum: float = Field(..., description="Desired funding amount")
    application_due_date: Optional[str] = Field(None, description="Application deadline (YYYY-MM-DD)")

class GrantEvaluation(BaseModel):
    relevance_score: int
    overall_score: int
    recommendation: str
    strengths: List[str]
    concerns: List[str]

class GrantResult(BaseModel):
    grant_id: str
    grant_name: str
    agency: str
    funding_amount: float
    evaluation: GrantEvaluation

class GrantSearchResponse(BaseModel):
    success: bool
    grants: List[GrantResult]
    total_found: int
    message: Optional[str] = None


# Subscription Models
class SubscriptionCreate(BaseModel):
    email: str = Field(..., description="Subscriber email address")
    organization_name: str = Field(..., description="Organization name")
    issue_area: str = Field(..., description="Main issue area or theme")
    scope_of_grant: str = Field(..., description="Detailed scope and objectives")
    kpis: List[str] = Field(default=[], description="Key Performance Indicators")
    funding_quantum: float = Field(..., description="Desired funding amount")


class SubscriptionResponse(BaseModel):
    id: str
    email: str
    organization_name: str
    issue_area: str
    scope_of_grant: str
    kpis: List[str]
    funding_quantum: float
    is_active: bool
    created_at: datetime


class NewGrantNotification(BaseModel):
    grant_id: str = Field(..., description="ID of the newly ingested grant")

# ==========================================
# INITIALIZE FASTAPI
# ==========================================
app = FastAPI(
    title="Grant Query Service",
    description="AI-powered grant discovery and evaluation system with streaming progress",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# ==========================================
# API ENDPOINTS
# ==========================================
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Grant Query Service",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Detailed health check for AlloyDB"""
    try:
        with get_session() as session:
            session.exec(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status
    }

@app.get("/grants", response_model=List[dict])
async def list_grants(current_user: dict = Depends(get_current_user)):
    """List all available grants in the database"""
    try:
        with get_session() as session:
            # Return all grants, sorted by is_open (open first)
            statement = select(Grant).order_by(Grant.is_open.desc())
            results = session.exec(statement).all()
            
            return [
                {
                    "id": g.id, 
                    "name": g.name, 
                    "agency": g.agency_name,
                    "max_funding": g.max_funding,
                    "is_open": g.is_open,
                    "original_url": g.original_url,
                    "application_url": g.application_url
                } 
                for g in results
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/organization", response_model=Optional[Organization])
async def get_organization(current_user: dict = Depends(get_current_user)):
    """Get the organization profile for the current user."""
    try:
        firebase_uid = current_user['uid']
        with get_session() as session:
            statement = select(Organization).where(Organization.firebase_uid == firebase_uid)
            org = session.exec(statement).first()
            return org
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/organization", response_model=Organization)
async def create_or_update_organization(
    org_data: Organization, 
    current_user: dict = Depends(get_current_user)
):
    """Create or update organization profile."""
    try:
        firebase_uid = current_user['uid']
        # Ensure the user is updating their own record
        org_data.firebase_uid = firebase_uid
        
        with get_session() as session:
            statement = select(Organization).where(Organization.firebase_uid == firebase_uid)
            existing_org = session.exec(statement).first()
            
            if existing_org:
                # Update existing
                for key, value in org_data.dict(exclude_unset=True).items():
                    # prevent overwriting id or uid if passed maliciously (though pydantic helps)
                    if key not in ['id', 'firebase_uid']:
                        setattr(existing_org, key, value)
                session.add(existing_org)
                session.commit()
                session.refresh(existing_org)
                return existing_org
            else:
                # Create new
                session.add(org_data)
                session.commit()
                session.refresh(org_data)
                return org_data
                
    except Exception as e:
        print(f"Error saving org: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=GrantSearchResponse)
async def search_grants(
    requirements: ProjectRequirements,
    current_user: dict = Depends(get_current_user)
):
    """
    Search and evaluate grants (traditional non-streaming endpoint)
    """
    try:
        print(f"User {current_user.get('email', 'unknown')} searching for grants")
        req_dict = requirements.model_dump()
        result = find_and_evaluate_grants_with_progress(req_dict)
        
        # Parse response
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0].strip()
        elif "```" in result:
            result = result.split("```")[1].split("```")[0].strip()
        
        grants_data = json.loads(result)
        
        if not isinstance(grants_data, list):
            raise ValueError("Response is not a list of grants")
        
        return GrantSearchResponse(
            success=True,
            grants=grants_data,
            total_found=len(grants_data),
            message="Grants successfully retrieved and evaluated"
        )
            
    except Exception as e:
        print(f"[Error] Search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Grant search failed: {str(e)}"
        )

@app.post("/search/stream")
async def search_grants_stream(
    requirements: ProjectRequirements,
    current_user: dict = Depends(get_current_user)
):
    """
    Search and evaluate grants with streaming progress updates
    
    Returns Server-Sent Events (SSE) stream with real-time progress
    """
    async def generate_progress() -> AsyncGenerator[str, None]:
        try:
            req_dict = requirements.model_dump()
            
            # Initial progress
            response = {
                'type': 'progress',
                'stage': 'initializing',
                'message': 'Connecting to AI agents...',
                'progress': 5,
                'details': {}
            }
            yield f"data: {json.dumps(response)}\n\n"
            await asyncio.sleep(0.1)
            
            progress_counter = 10
            
            # Generator function that will run in thread
            def run_streaming_generator():
                for update in find_and_evaluate_grants_streaming(req_dict):
                    yield update
            
            # Process updates as they come
            loop = asyncio.get_event_loop()
            executor = loop.run_in_executor
            
            # We need a different approach - use a queue
            import queue
            import threading
            
            update_queue = queue.Queue()
            
            def run_in_thread():
                try:
                    for update in find_and_evaluate_grants_streaming(req_dict):
                        update_queue.put(update)
                    update_queue.put(None)  # Signal completion
                except Exception as e:
                    update_queue.put({"type": "error", "error": str(e)})
            
            # Start the AI process in background thread
            thread = threading.Thread(target=run_in_thread)
            thread.start()
            
            # Stream updates as they arrive
            while True:
                try:
                    # Non-blocking get with timeout
                    update = update_queue.get(timeout=0.1)
                    
                    if update is None:
                        break
                    
                    if update['type'] == 'error':
                        error_response = {
                            'type': 'error',
                            'stage': 'error',
                            'message': f'Search failed: {update["error"]}',
                            'progress': 0
                        }
                        yield f"data: {json.dumps(error_response)}\n\n"
                        break
                    
                    elif update['type'] == 'progress':
                        progress_counter = min(progress_counter + 10, 90)
                        data = update['data']
                        response = {
                            'type': 'progress',
                            'stage': data.get('stage', 'processing'),
                            'message': data.get('message', ''),
                            'progress': progress_counter,
                            'details': data.get('details', {})
                        }
                        yield f"data: {json.dumps(response)}\n\n"
                        
                    elif update['type'] == 'result':
                        # Parse final result
                        result = update['data']
                        
                        # Handle case where result is already a Python object
                        if isinstance(result, (list, dict)):
                            grants_data = result
                        else:
                            # Result is a string, may need cleaning
                            if isinstance(result, str):
                                if "```json" in result:
                                    result = result.split("```json")[1].split("```")[0].strip()
                                elif "```" in result:
                                    result = result.split("```")[1].split("```")[0].strip()
                            grants_data = json.loads(result)
                        
                        # Final response
                        response = {
                            'type': 'complete',
                            'stage': 'complete',
                            'message': 'Search complete!',
                            'progress': 100,
                            'data': {
                                'success': True,
                                'grants': grants_data,
                                'total_found': len(grants_data)
                            }
                        }
                        yield f"data: {json.dumps(response)}\n\n"
                        
                except queue.Empty:
                    # No update available, just wait
                    await asyncio.sleep(0.1)
                    continue
            
            # Wait for thread to complete
            thread.join(timeout=60)
            
        except Exception as e:
            error_response = {
                'type': 'error',
                'stage': 'error',
                'message': f'Search failed: {str(e)}',
                'progress': 0
            }
            yield f"data: {json.dumps(error_response)}\n\n"
    
    return StreamingResponse(
        generate_progress(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ==========================================
# SUBSCRIPTION ENDPOINTS
# ==========================================
@app.post("/subscribe", response_model=SubscriptionResponse)
async def create_subscription(sub: SubscriptionCreate):
    """
    Subscribe to email notifications for new grants matching criteria.
    """
    try:
        # Generate embedding for preferences
        preference_text = f"{sub.issue_area} {sub.scope_of_grant} {' '.join(sub.kpis)}"
        preference_embedding = embeddings.embed_query(preference_text)
        
        # Create subscription
        subscription = Subscription(
            email=sub.email,
            organization_name=sub.organization_name,
            issue_area=sub.issue_area,
            scope_of_grant=sub.scope_of_grant,
            kpis=sub.kpis,
            funding_quantum=sub.funding_quantum,
            preference_embedding=preference_embedding,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        with get_session() as session:
            # Check if email already subscribed with similar preferences
            existing = session.exec(
                select(Subscription).where(
                    Subscription.email == sub.email,
                    Subscription.is_active == True
                )
            ).first()
            
            if existing:
                # Update existing subscription
                existing.issue_area = sub.issue_area
                existing.scope_of_grant = sub.scope_of_grant
                existing.kpis = sub.kpis
                existing.funding_quantum = sub.funding_quantum
                existing.preference_embedding = preference_embedding
                session.add(existing)
                session.commit()
                session.refresh(existing)
                
                return SubscriptionResponse(
                    id=existing.id,
                    email=existing.email,
                    organization_name=existing.organization_name,
                    issue_area=existing.issue_area,
                    scope_of_grant=existing.scope_of_grant,
                    kpis=existing.kpis,
                    funding_quantum=existing.funding_quantum,
                    is_active=existing.is_active,
                    created_at=existing.created_at
                )
            
            # Create new subscription
            session.add(subscription)
            session.commit()
            session.refresh(subscription)
            
            return SubscriptionResponse(
                id=subscription.id,
                email=subscription.email,
                organization_name=subscription.organization_name,
                issue_area=subscription.issue_area,
                scope_of_grant=subscription.scope_of_grant,
                kpis=subscription.kpis,
                funding_quantum=subscription.funding_quantum,
                is_active=subscription.is_active,
                created_at=subscription.created_at
            )
            
    except Exception as e:
        print(f"[Subscribe Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/subscriptions/{email}", response_model=List[SubscriptionResponse])
async def get_subscriptions(email: str):
    """
    Get all active subscriptions for an email address.
    """
    try:
        with get_session() as session:
            results = session.exec(
                select(Subscription).where(
                    Subscription.email == email,
                    Subscription.is_active == True
                )
            ).all()
            
            return [
                SubscriptionResponse(
                    id=s.id,
                    email=s.email,
                    organization_name=s.organization_name,
                    issue_area=s.issue_area,
                    scope_of_grant=s.scope_of_grant,
                    kpis=s.kpis,
                    funding_quantum=s.funding_quantum,
                    is_active=s.is_active,
                    created_at=s.created_at
                )
                for s in results
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/subscriptions/{subscription_id}")
async def unsubscribe(subscription_id: str):
    """
    Unsubscribe (deactivate) a subscription.
    """
    try:
        with get_session() as session:
            subscription = session.get(Subscription, subscription_id)
            if not subscription:
                raise HTTPException(status_code=404, detail="Subscription not found")
            
            subscription.is_active = False
            session.add(subscription)
            session.commit()
            
            return {"success": True, "message": "Successfully unsubscribed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )