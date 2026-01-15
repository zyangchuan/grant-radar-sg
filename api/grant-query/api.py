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

# Import our AI service
from grant_service import find_and_evaluate_grants, find_and_evaluate_grants_streaming
from database import get_session
from models import Grant
from sqlmodel import select
from sqlalchemy import text

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
async def list_grants():
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

@app.post("/search", response_model=GrantSearchResponse)
async def search_grants(requirements: ProjectRequirements):
    """
    Search and evaluate grants (traditional non-streaming endpoint)
    """
    try:
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
async def search_grants_stream(requirements: ProjectRequirements):
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



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )