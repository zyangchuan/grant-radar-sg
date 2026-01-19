"""
grant_service.py - Simplified Grant Search & Evaluation (Gemini + AlloyDB)
"""
import json
import os
from typing import List, Dict, Generator

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
from sqlalchemy import text

from database import get_session
from models import Grant

load_dotenv()

# ==========================================
# INITIALIZATION
# ==========================================
print("[System] Initializing Gemini & AlloyDB...", flush=True)

llm = ChatGoogleGenerativeAI(
    model="gemini-3-flash-preview",
    temperature=0.0,
    timeout=60,
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004"
)

# Progress callback
_progress_callback = None

def set_progress_callback(callback):
    global _progress_callback
    _progress_callback = callback

def emit_progress(stage: str, message: str, details: dict = None):
    if _progress_callback:
        _progress_callback({"stage": stage, "message": message, "details": details or {}})

# ==========================================
# CORE FUNCTIONS
# ==========================================
def search_grants(query: str, limit: int = 5) -> List[Dict]:
    """Vector search for grants in AlloyDB"""
    print(f"[Search] Query: '{query}'", flush=True)
    emit_progress("searching", f"🔍 Searching database for: '{query}'")
    
    try:
        query_vector = embeddings.embed_query(query)
        print(f"[Search] Embedded into {len(query_vector)} dimensions", flush=True)
        
        with get_session() as session:
            sql = text("""
                SELECT id, name, agency_name, full_text_context, max_funding, application_url, deadline, original_url
                FROM grants
                WHERE is_open = TRUE
                ORDER BY embedding <=> CAST(:vector AS vector)
                LIMIT :limit
            """)
            
            vector_str = f"[{','.join(map(str, query_vector))}]"
            results = session.execute(sql, {"vector": vector_str, "limit": limit}).fetchall()
            
            print(f"[Search] Found {len(results)} potential grants", flush=True)
            emit_progress("searching", f"✓ Checking {len(results)} potential grants...")
            
            grants = []
            for row in results:
                grant = {
                    "id": row[0],
                    "name": row[1] or "Unknown Grant",
                    "agency": row[2] or "Unknown Agency",
                    "description": (row[3] or "")[:500],
                    "max_funding": row[4],
                    "application_url": row[5],
                    "deadline": row[6] or "Open",
                    "original_url": row[7]
                }
                print(f"[Search] - {grant['name']}", flush=True)
                grants.append(grant)
            
            return grants


            
    except Exception as e:
        print(f"[Search Error] {e}", flush=True)
        return []

def evaluate_grants(grants: List[Dict], requirements: dict) -> List[Dict]:
    """Use Gemini to evaluate and score grants"""
    if not grants:
        return []
    
    emit_progress("evaluating", f"📊 Analyzing {len(grants)} grants with AI...")
    print(f"[Evaluate] Evaluating {len(grants)} grants", flush=True)
    
    # Build grants summary for Gemini
    grants_text = ""
    for i, g in enumerate(grants):
        grants_text += f"""
Grant {i+1}:
- ID: {g['id']}
- Name: {g['name']}
- Agency: {g['agency']}
- Max Funding: ${g['max_funding'] or 'Unknown'}
- Description: {g['description'][:300]}...
---
"""
    
    prompt = f"""You are a grant matching expert. Evaluate these grants for the user's project.

USER PROJECT:
- Issue Area: {requirements.get('issue_area', 'General')}
- Scope: {requirements.get('scope_of_grant', 'General project')}
- KPIs: {requirements.get('kpis', [])}
- Funding Needed: ${requirements.get('funding_quantum', 0)}

AVAILABLE GRANTS:
{grants_text}

For each grant, provide a JSON array with this EXACT structure:
[
  {{
    "grant_id": "exact id from above",
    "grant_name": "exact name from above",
    "agency": "agency name",
    "funding_amount": number or null,
    "evaluation": {{
      "relevance_score": 0-100,
      "overall_score": 0-100,
      "recommendation": "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "NOT_RECOMMENDED",
      "strengths": ["strength 1", "strength 2"],
      "concerns": ["concern 1"]
    }}
  }}
]

IMPORTANT:
- Return ONLY the JSON array, no markdown code blocks
- Include ALL grants from the list above
- Score fairly based on match with user's project
"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        
        # Handle response.content being either string or list
        raw_content = response.content
        print(f"[Evaluate] Raw response type: {type(raw_content)}", flush=True)
        
        if isinstance(raw_content, list):
            # Extract text from list of content parts
            content = "".join([
                part.get("text", str(part)) if isinstance(part, dict) else str(part)
                for part in raw_content
            ])
        else:
            content = raw_content
        
        content = content.strip()
        print(f"[Evaluate] Content length: {len(content)} chars", flush=True)
        
        # Handle empty response
        if not content:
            print("[Evaluate] WARNING: Empty response from LLM, using fallback", flush=True)
            raise ValueError("Empty response from LLM")
        
        # Clean markdown if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        evaluated = json.loads(content)
        print(f"[Evaluate] AI returned {len(evaluated)} matching grants", flush=True)
        emit_progress("evaluating", f"✓ Found {len(evaluated)} matching grants")


        
        # Merge application_url, original_url and deadline from original grants into evaluated results
        grant_app_urls = {g["id"]: g.get("application_url") for g in grants}
        grant_original_urls = {g["id"]: g.get("original_url") for g in grants}
        grant_deadlines = {g["id"]: g.get("deadline", "Open") for g in grants}
        for item in evaluated:
            gid = item.get("grant_id")
            if gid:
                item["application_url"] = grant_app_urls.get(gid)
                item["original_url"] = grant_original_urls.get(gid)
                item["details_url"] = grant_original_urls.get(gid)  # Details = info page
                item["deadline"] = grant_deadlines.get(gid, "Open")
        
        return evaluated


        
    except Exception as e:
        print(f"[Evaluate Error] {e}", flush=True)
        import traceback
        traceback.print_exc()
        # Return grants without evaluation as fallback
        return [{
            "grant_id": g["id"],
            "grant_name": g["name"],
            "agency": g["agency"],
            "funding_amount": g["max_funding"],
            "application_url": g.get("application_url"),
            "original_url": g.get("original_url"),
            "details_url": g.get("original_url"),
            "deadline": g.get("deadline", "Open"),
            "evaluation": {
                "relevance_score": 50,
                "overall_score": 50,
                "recommendation": "RECOMMENDED",
                "strengths": ["Matches search criteria"],
                "concerns": ["Manual review needed"]
            }
        } for g in grants]



# ==========================================
# PUBLIC API
# ==========================================
def find_and_evaluate_grants(project_requirements: dict) -> str:
    """Main entry point - returns JSON string"""
    print("\n" + "="*60, flush=True)
    print("GRANT SEARCH - START", flush=True)
    print("="*60, flush=True)
    
    emit_progress("initializing", "🚀 Starting grant search...")
    
    # 1. Build search query from requirements
    issue = project_requirements.get("issue_area", "")
    scope = project_requirements.get("scope_of_grant", "")
    search_query = f"{issue} {scope}".strip() or "community grants Singapore"
    
    # 2. Search database
    grants = search_grants(search_query, limit=5)
    
    if not grants:
        emit_progress("complete", "No grants found")
        return "[]"
    
    # 3. Evaluate with Gemini
    evaluated = evaluate_grants(grants, project_requirements)
    
    # 4. Sort by score and return top results
    evaluated.sort(key=lambda x: x.get("evaluation", {}).get("overall_score", 0), reverse=True)
    
    emit_progress("complete", f"✅ Found {len(evaluated)} matching grants")
    
    print("="*60, flush=True)
    print("GRANT SEARCH - COMPLETE", flush=True)
    print("="*60, flush=True)
    
    return json.dumps(evaluated[:3])  # Return top 3

def find_and_evaluate_grants_streaming(project_requirements: dict) -> Generator[dict, None, None]:
    """Streaming version with progress updates"""
    import queue
    import threading
    import time
    
    progress_queue = queue.Queue()
    
    def progress_handler(update):
        progress_queue.put({"type": "progress", "data": update})
    
    set_progress_callback(progress_handler)
    
    yield {"type": "progress", "data": {"stage": "initializing", "message": "🚀 Starting search...", "details": {}}}
    
    def run_search():
        try:
            result = find_and_evaluate_grants(project_requirements)
            progress_queue.put({"type": "result", "data": result})
        except Exception as e:
            progress_queue.put({"type": "error", "data": str(e)})
        finally:
            progress_queue.put({"type": "done"})
    
    thread = threading.Thread(target=run_search, daemon=True)
    thread.start()
    
    last_time = time.time()
    
    while True:
        try:
            update = progress_queue.get(timeout=0.5)
            
            if update["type"] == "done":
                break
            elif update["type"] == "error":
                yield {"type": "error", "data": {"message": update["data"]}}
                break
            elif update["type"] == "result":
                yield {"type": "progress", "data": {"stage": "complete", "message": "✅ Search complete!", "details": {}}}
                yield update
                break
            else:
                yield update
                last_time = time.time()
                
        except queue.Empty:
            if time.time() - last_time > 2.0:
                yield {"type": "progress", "data": {"stage": "processing", "message": "⚙️ Processing...", "details": {}}}
                last_time = time.time()
    
    set_progress_callback(None)
    thread.join(timeout=1)
