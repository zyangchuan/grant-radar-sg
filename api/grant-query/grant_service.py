"""
grant_service.py - AI Agent Logic with Streaming Support
"""
import json
import os
from typing import List, Dict, Generator

from langchain_openai import ChatOpenAI
from langchain.messages import HumanMessage
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_chroma import Chroma
from dotenv import load_dotenv
import chromadb

load_dotenv()

# ==========================================
# GLOBAL RESOURCE INITIALIZATION
# ==========================================
COLLECTION_NAME = "oursg_grants"
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))

print(f"[System] Connecting to ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}...")

# Use HTTP client for Docker ChromaDB
chroma_client = chromadb.HttpClient(
    host=CHROMA_HOST,
    port=CHROMA_PORT
)

# Initialize Vector Store
vector_store = Chroma(
    client=chroma_client,
    collection_name=COLLECTION_NAME,
)
print("[System] ✓ Vector Database Connected.")

# Initialize LLM - use faster model with lower timeout
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, request_timeout=10)  # Reduced from 15 to 10

# Global variable to track streaming progress
_progress_callback = None

def set_progress_callback(callback):
    """Set a callback function to receive progress updates"""
    global _progress_callback
    _progress_callback = callback

def emit_progress(stage: str, message: str, details: dict = None):
    """Emit progress update if callback is set"""
    if _progress_callback:
        _progress_callback({
            "stage": stage,
            "message": message,
            "details": details or {}
        })

# ==========================================
# SEARCH TOOL
# ==========================================
@tool
def search_grants_database(query: str) -> str:
    """
    Searches the grants database for relevant schemes based on a natural language query.
    Returns the top 3 matching grants with their IDs, names, and descriptions.
    """
    emit_progress("searching", f"🔍 Searching database for: '{query}'", {"query": query})
    print(f"\n  >> [Tool Call] Searching DB for: '{query}'")
    
    results = vector_store.similarity_search(query, k=3)  # Reduced from 5 to 3
    
    if not results:
        emit_progress("searching", "No grants found, trying broader search...")
        return "No grants found matching the query."
    
    emit_progress("searching", f"✓ Found {len(results)} candidate grants", {"count": len(results)})
    
    output = []
    for doc in results:
        output.append(
            f"ID: {doc.metadata['id']}\n"
            f"Name: {doc.metadata['name']}\n"
            f"Agency: {doc.metadata['agency_name']}\n"
            f"Funding Amount: ${doc.metadata['funding_amount']}\n"
            f"Categories: {doc.metadata.get('categories', 'N/A')}\n"
            f"Description: {doc.page_content[:150]}...\n"  # Reduced from 300 to 150
            f"---"
        )
    return "\n".join(output)

# ==========================================
# EVALUATOR AGENT
# ==========================================
@tool
def evaluate_grant_relevance(grant_data: str, requirements: str) -> str:
    """
    Evaluates a single grant against project requirements.
    Returns a JSON score with relevance and quick reasoning.
    """
    # Extract grant name for progress message
    grant_name = "Unknown"
    if "Name:" in grant_data:
        grant_name = grant_data.split("Name:")[1].split("\n")[0].strip()
    
    emit_progress("evaluating", f"📊 Evaluating: {grant_name}", {"grant": grant_name})
    print(f"\n  >> [Evaluator] Assessing grant relevance for: {grant_name}")
    
    # Simplified, faster evaluation prompt
    evaluator_prompt = f"""You are a grant evaluator. Quickly assess this grant.

GRANT: {grant_data}

PROJECT: {requirements}

Return ONLY this JSON (be quick and direct):
{{
    "relevance_score": <0-100>,
    "overall_score": <0-100>,
    "strengths": ["top 2 strengths"],
    "concerns": ["top 1-2 concerns"],
    "recommendation": "HIGHLY_RECOMMENDED | RECOMMENDED | NOT_RECOMMENDED"
}}

Score 70+ = excellent match, 50-69 = good match, below 50 = poor match."""

    response = llm.invoke([HumanMessage(content=evaluator_prompt)])
    
    # Try to extract score for progress update
    try:
        result_json = json.loads(response.content.replace("```json", "").replace("```", "").strip())
        score = result_json.get("overall_score", "?")
        emit_progress("evaluating", f"✓ Scored {grant_name}: {score}/100", {
            "grant": grant_name,
            "score": score
        })
    except:
        emit_progress("evaluating", f"✓ Completed evaluation for {grant_name}")
    
    return response.content

# ==========================================
# SEARCH AGENT
# ==========================================
search_agent_prompt = """You are the Search Specialist Agent for grant discovery.

YOUR ROLE:
1. Analyze the project requirements
2. Formulate ONE targeted search query (not multiple queries)
3. Use search_grants_database tool ONCE
4. Return the results immediately

IMPORTANT:
- Create a single, focused search query using key terms from issue_area and scope
- Do NOT make multiple searches
- Return ALL grants found"""

search_agent = create_agent(
    model=llm,
    tools=[search_grants_database],
    system_prompt=search_agent_prompt
)

# ==========================================
# COORDINATOR AGENT
# ==========================================
@tool
def call_search_agent(requirements: str) -> str:
    """Invokes the search agent to find relevant grants based on project requirements."""
    emit_progress("coordinating", "🤖 Activating Search Agent...", {"agent": "search"})
    print("\n[Coordinator] Calling Search Agent...")
    
    response = search_agent.invoke({
        "messages": [HumanMessage(content=f"Find grants for these requirements:\n{requirements}")]
    })
    
    emit_progress("coordinating", "✓ Search Agent completed", {"agent": "search"})
    return response["messages"][-1].content

@tool
def call_evaluator(grant_data: str, requirements: str) -> str:
    """Evaluates a grant's relevance and sustainability alignment."""
    return evaluate_grant_relevance.invoke({"grant_data": grant_data, "requirements": requirements})

coordinator_prompt = """You are the Coordinator Agent for grant retrieval.

WORKFLOW:
1. Call search agent to find grants (ONCE)
2. Evaluate each grant found (up to 3 grants)
3. Return top 2 grants as JSON

OUTPUT FORMAT:
[
    {
        "grant_id": "...",
        "grant_name": "...",
        "agency": "...",
        "funding_amount": ...,
        "evaluation": {
            "relevance_score": ...,
            "overall_score": ...,
            "recommendation": "...",
            "strengths": [...],
            "concerns": [...]
        }
    }
]

RULES:
- Return top 2 grants only
- Include grants with overall_score >= 40 (lowered threshold)
- Be quick and efficient"""

coordinator_agent = create_agent(
    model=llm,
    tools=[call_search_agent, call_evaluator],
    system_prompt=coordinator_prompt
)

# ==========================================
# PUBLIC API FUNCTIONS
# ==========================================
def find_and_evaluate_grants(project_requirements: dict) -> str:
    """
    Main entry point for the grant retrieval system.
    
    Args:
        project_requirements: Dict containing issue_area, scope_of_grant, kpis, 
                            funding_quantum, application_due_date
    
    Returns:
        JSON string with evaluated and ranked grants
    """
    print("\n" + "="*60)
    print("GRANT RETRIEVAL SYSTEM - STARTING")
    print("="*60)
    
    emit_progress("initializing", "🚀 Starting grant analysis...", {"requirements": project_requirements})
    
    response = coordinator_agent.invoke({
        "messages": [HumanMessage(content=json.dumps(project_requirements, indent=2))]
    })
    
    result = response["messages"][-1].content
    
    emit_progress("finalizing", "✅ Analysis complete, preparing results...")
    
    print("\n" + "="*60)
    print("GRANT RETRIEVAL SYSTEM - COMPLETE")
    print("="*60)
    
    return result

def find_and_evaluate_grants_streaming(project_requirements: dict) -> Generator[dict, None, None]:
    """
    Streaming version that yields progress updates in real-time.
    
    Yields:
        Progress updates as dicts with stage, message, details
    """
    import queue
    import threading
    
    # Create a queue for progress updates from callbacks
    progress_queue = queue.Queue()
    
    def progress_handler(update):
        progress_queue.put({"type": "progress", "data": update})
    
    # Set callback
    set_progress_callback(progress_handler)
    
    yield {"type": "progress", "data": {
        "stage": "initializing",
        "message": "🚀 Starting grant analysis...",
        "details": {}
    }}
    
    print("\n" + "="*60)
    print("GRANT RETRIEVAL SYSTEM - STARTING")
    print("="*60)
    
    yield {"type": "progress", "data": {
        "stage": "analyzing",
        "message": "📋 Analyzing project requirements...",
        "details": {}
    }}
    
    # Track what we've seen
    seen_searches = 0
    seen_evaluations = 0
    agent_started = False
    
    def run_agent():
        try:
            result = coordinator_agent.invoke({
                "messages": [HumanMessage(content=json.dumps(project_requirements, indent=2))]
            })
            progress_queue.put({"type": "result", "data": result["messages"][-1].content})
        except Exception as e:
            progress_queue.put({"type": "error", "data": str(e)})
        finally:
            progress_queue.put({"type": "done"})
    
    # Start agent in background thread
    thread = threading.Thread(target=run_agent, daemon=True)
    thread.start()
    
    # Stream progress updates as they come
    import time
    last_update_time = time.time()
    
    while True:
        try:
            # Get update with timeout
            update = progress_queue.get(timeout=0.5)
            
            if update["type"] == "done":
                break
            elif update["type"] == "error":
                yield {"type": "error", "data": {"message": update["data"]}}
                break
            elif update["type"] == "result":
                yield {"type": "progress", "data": {
                    "stage": "finalizing",
                    "message": "✅ Analysis complete, preparing results...",
                    "details": {}
                }}
                yield update
                break
            elif update["type"] == "progress":
                # Forward the actual progress from tools
                data = update["data"]
                stage = data.get("stage", "")
                
                # Track stats
                if stage == "searching":
                    seen_searches += 1
                elif stage == "evaluating":
                    seen_evaluations += 1
                
                if not agent_started and stage == "coordinating":
                    agent_started = True
                
                yield update
                last_update_time = time.time()
                
        except queue.Empty:
            # No update in 0.5s, send a generic heartbeat if it's been a while
            current_time = time.time()
            if current_time - last_update_time > 2.0:
                # Generate contextual message based on what we've seen
                if seen_evaluations > 0:
                    message = f"📊 Still evaluating grants... (evaluated {seen_evaluations} so far)"
                elif seen_searches > 0:
                    message = f"🔍 Still searching for relevant grants..."
                elif agent_started:
                    message = "🤖 AI agents are analyzing your requirements..."
                else:
                    message = "⚙️ Processing your request..."
                
                yield {"type": "progress", "data": {
                    "stage": "processing",
                    "message": message,
                    "details": {"searches": seen_searches, "evaluations": seen_evaluations}
                }}
                last_update_time = current_time
            continue
    
    # Cleanup
    set_progress_callback(None)
    thread.join(timeout=1)
    
    print("\n" + "="*60)
    print("GRANT RETRIEVAL SYSTEM - COMPLETE")
    print("="*60)

def get_chroma_client():
    """Returns the ChromaDB client for health checks"""
    return chroma_client

def get_vector_store():
    """Returns the vector store instance"""
    return vector_store