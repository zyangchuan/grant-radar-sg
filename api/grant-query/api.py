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
from grant_service import find_and_evaluate_grants_with_progress, get_chroma_client, COLLECTION_NAME

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
    sustainability_score: int
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
    """Detailed health check"""
    try:
        chroma_client = get_chroma_client()
        chroma_client.heartbeat()
        chroma_status = "connected"
    except Exception as e:
        chroma_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if chroma_status == "connected" else "degraded",
        "chromadb": chroma_status,
        "collection": COLLECTION_NAME
    }

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
            
            # Step 1: Initialization
            yield f"data: {json.dumps({'status': 'initializing', 'message': 'Connecting to AI agents...', 'progress': 10})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 2: Understanding requirements
            yield f"data: {json.dumps({'status': 'analyzing', 'message': 'Analyzing project requirements...', 'progress': 20})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 3: Searching
            yield f"data: {json.dumps({'status': 'searching', 'message': 'Searching grant database...', 'progress': 40})}\n\n"
            await asyncio.sleep(0.5)
            
            # Step 4: Finding candidates
            yield f"data: {json.dumps({'status': 'searching', 'message': 'Found candidate grants, evaluating relevance...', 'progress': 60})}\n\n"
            
            # Run the actual AI search (this takes the longest)
            result = await asyncio.to_thread(find_and_evaluate_grants_with_progress, req_dict)
            
            # Step 5: Evaluating
            yield f"data: {json.dumps({'status': 'evaluating', 'message': 'Scoring grants against your criteria...', 'progress': 80})}\n\n"
            await asyncio.sleep(0.5)
            
            # Step 6: Finalizing
            yield f"data: {json.dumps({'status': 'finalizing', 'message': 'Ranking results...', 'progress': 90})}\n\n"
            await asyncio.sleep(0.2)
            
            # Parse response
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()
            
            grants_data = json.loads(result)
            
            # Step 7: Complete
            response = {
                'status': 'complete',
                'message': 'Search complete!',
                'progress': 100,
                'data': {
                    'success': True,
                    'grants': grants_data,
                    'total_found': len(grants_data)
                }
            }
            yield f"data: {json.dumps(response)}\n\n"
            
        except Exception as e:
            error_response = {
                'status': 'error',
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
        }
    )

@app.post("/refresh-data")
async def refresh_grant_data():
    """Manually trigger data refresh from OurSG API"""
    try:
        from scripts.ingest_grants import fetch_and_store_grants
        success = fetch_and_store_grants()
        
        if success:
            return {
                "success": True,
                "message": "Grant data successfully refreshed"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Data refresh failed"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Data refresh error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )