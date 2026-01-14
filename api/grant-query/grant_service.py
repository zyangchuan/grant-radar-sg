"""
grant_service.py - AI Agent Logic for Grant Discovery and Evaluation
"""
import json
import os
from typing import List, Dict

from langchain_openai import ChatOpenAI
from langchain.messages import HumanMessage
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
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

embedding_func = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize Vector Store
vector_store = Chroma(
    client=chroma_client,
    collection_name=COLLECTION_NAME,
    embedding_function=embedding_func
)
print("[System] ✓ Vector Database Connected.")

# Initialize LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, request_timeout=15)

# ==========================================
# SEARCH TOOL
# ==========================================
@tool
def search_grants_database(query: str) -> str:
    """
    Searches the grants database for relevant schemes based on a natural language query.
    Returns the top 5 matching grants with their IDs, names, and descriptions.
    """
    print(f"\n  >> [Tool Call] Searching DB for: '{query}'")
    results = vector_store.similarity_search(query, k=5)
    
    if not results:
        return "No grants found matching the query."
    
    output = []
    for doc in results:
        output.append(
            f"ID: {doc.metadata['id']}\n"
            f"Name: {doc.metadata['name']}\n"
            f"Agency: {doc.metadata['agency_name']}\n"
            f"Funding Amount: ${doc.metadata['funding_amount']}\n"
            f"Categories: {doc.metadata.get('categories', 'N/A')}\n"
            f"Description: {doc.page_content[:300]}...\n"
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
    Returns a JSON score with relevance, sustainability alignment, and reasoning.
    """
    print(f"\n  >> [Evaluator] Assessing grant relevance...")
    
    evaluator_prompt = f"""You are an expert grant evaluator specializing in sustainability initiatives.

GRANT DETAILS:
{grant_data}

PROJECT REQUIREMENTS:
{requirements}

Evaluate this grant and return ONLY a JSON object with this exact structure:
{{
    "relevance_score": <0-100>,
    "sustainability_score": <0-100>,
    "overall_score": <0-100>,
    "strengths": ["list", "of", "strengths"],
    "concerns": ["list", "of", "concerns"],
    "recommendation": "HIGHLY_RECOMMENDED | RECOMMENDED | CONDITIONAL | NOT_RECOMMENDED"
}}

SCORING CRITERIA:
- relevance_score: How well the grant matches the project's issue area, scope, and KPIs
- sustainability_score: How strongly the grant supports environmental sustainability goals
- overall_score: Weighted average (relevance 60%, sustainability 40%)

Be strict but fair. A score above 70 is excellent, 50-70 is good, below 50 is poor."""

    response = llm.invoke([HumanMessage(content=evaluator_prompt)])
    return response.content

# ==========================================
# SEARCH AGENT
# ==========================================
search_agent_prompt = """You are the Search Specialist Agent for grant discovery.

YOUR ROLE:
1. Analyze the project requirements provided
2. Formulate 1-2 targeted search queries to find relevant grants
3. Use the search_grants_database tool to retrieve candidates
4. Return the raw results as a structured list

IMPORTANT:
- Extract key terms from: issue_area, scope_of_grant, and funding_quantum
- Look for grants that mention sustainability, environment, or related terms
- Return ALL unique grants found (no duplicates)
- Format output as a simple list with grant IDs and basic info"""

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
    print("\n[Coordinator] Calling Search Agent...")
    response = search_agent.invoke({
        "messages": [HumanMessage(content=f"Find grants for these requirements:\n{requirements}")]
    })
    return response["messages"][-1].content

@tool
def call_evaluator(grant_data: str, requirements: str) -> str:
    """Evaluates a grant's relevance and sustainability alignment."""
    return evaluate_grant_relevance.invoke({"grant_data": grant_data, "requirements": requirements})

coordinator_prompt = """You are the Coordinator Agent for an intelligent Grant Retrieval System.

YOUR WORKFLOW (MUST FOLLOW IN ORDER):
1. UNDERSTAND: Parse the user's project requirements (JSON format)
2. SEARCH: Call the search agent to find candidate grants
3. EVALUATE: For each grant found, call the evaluator to assess quality
4. RANK: Sort grants by overall_score (highest first)
5. RETURN: Output the top 3 grants as a JSON array with evaluation scores

OUTPUT FORMAT:
[
    {
        "grant_id": "...",
        "grant_name": "...",
        "agency": "...",
        "funding_amount": ...,
        "evaluation": {
            "relevance_score": ...,
            "sustainability_score": ...,
            "overall_score": ...,
            "recommendation": "...",
            "strengths": [...],
            "concerns": [...]
        }
    }
]

CRITICAL RULES:
- Only return grants with overall_score >= 50
- Maximum 3 grants in final output
- Ensure all grants are unique (no duplicates)
- Include full evaluation details for transparency"""

coordinator_agent = create_agent(
    model=llm,
    tools=[call_search_agent, call_evaluator],
    system_prompt=coordinator_prompt
)

# ==========================================
# PUBLIC API FUNCTION
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
    
    response = coordinator_agent.invoke({
        "messages": [HumanMessage(content=json.dumps(project_requirements, indent=2))]
    })
    
    result = response["messages"][-1].content
    
    print("\n" + "="*60)
    print("GRANT RETRIEVAL SYSTEM - COMPLETE")
    print("="*60)
    
    return result

# Alias for backward compatibility and streaming endpoint
find_and_evaluate_grants_with_progress = find_and_evaluate_grants

def get_chroma_client():
    """Returns the ChromaDB client for health checks"""
    return chroma_client

def get_vector_store():
    """Returns the vector store instance"""
    return vector_store