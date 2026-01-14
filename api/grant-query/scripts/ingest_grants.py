#!/usr/bin/env python3
import os
import sys
import requests
from datetime import datetime
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import chromadb

print("[System] Initializing Embedding Model...")
model_name = "sentence-transformers/all-MiniLM-l6-v2"
embeddings = HuggingFaceEmbeddings(model_name=model_name)

COLLECTION_NAME = "oursg_grants"

# Connect to ChromaDB server (Docker or local)
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))

print(f"[System] Connecting to ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}...")

# Use HTTP client for Docker ChromaDB
chroma_client = chromadb.HttpClient(
    host=CHROMA_HOST,
    port=CHROMA_PORT
)

# Initialize Vector Store with HTTP client
vector_store = Chroma(
    client=chroma_client,
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings
)
print("[System] ✓ Vector Database Connected.")

# ==========================================
# 2. DATA INGESTION (ETL Pipeline)
# ==========================================
def fetch_and_store_grants():
    """
    Fetches grant data from OurSG API, processes it, and stores embeddings in ChromaDB.
    This should be run periodically to keep the database updated.
    """
    url = "https://oursggrants.gov.sg/api/v1/grant_metadata/explore_grants"
    print(f"\n[Ingest] Fetching data from {url}...")

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[Error] Failed to fetch data: {e}")
        return False

    grants_list = data.get("grant_metadata", [])
    documents = []

    print(f"[Ingest] Processing {len(grants_list)} grants...")

    for grant in grants_list:
        # Create rich natural language description for semantic search
        applicable_to = grant.get('applicable_to', [])
        target_audience = ', '.join(applicable_to) if applicable_to else 'Not specified'
        
        page_content = (
            f"Grant Name: {grant.get('name', 'Unknown')}\n"
            f"Agency: {grant.get('agency_name', 'Unknown')}\n"
            f"Description: {grant.get('desc', 'No description available')}\n"
            f"Target Audience: {target_audience}\n"
            f"Funding Amount: {grant.get('grant_amount', 'Not specified')}\n"
            f"Categories: {', '.join(grant.get('categories', []))}\n"
        )

        # Sanitize metadata (ChromaDB requires flat types)
        metadata = {
            "id": str(grant.get("id", "")),
            "name": grant.get("name", "Unknown"),
            "agency_name": grant.get("agency_name", "Unknown"),
            "funding_amount": float(grant.get("grant_amount") or 0.0),
            "updated_at": grant.get("updated_at", ""),
            "categories": ', '.join(grant.get('categories', [])),
        }

        documents.append(Document(page_content=page_content, metadata=metadata))

    if len(documents) > 0:
        print(f"[Ingest] Saving {len(documents)} vectors to ChromaDB...")
        
        # Clear existing collection to avoid duplicates
        try:
            chroma_client.delete_collection(name=COLLECTION_NAME)
            print("[Ingest] Cleared old collection...")
        except Exception as e:
            print(f"[Ingest] No existing collection to clear: {e}")
        
        # Recreate vector store with fresh collection
        global vector_store
        vector_store = Chroma(
            client=chroma_client,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings
        )
        
        # Add new documents
        vector_store.add_documents(documents)
        print("[Ingest] ✓ Success! Database updated with latest grants.")
        return True
    else:
        print("[Ingest] No documents found to process.")
        return False

if __name__ == "__main__":
    print(f"[{datetime.now()}] Starting grant ingestion job...")
    success = fetch_and_store_grants()
    if success:
        print(f"[{datetime.now()}] ✓ Ingestion completed successfully")
        sys.exit(0)
    else:
        print(f"[{datetime.now()}] ✗ Ingestion failed")
        sys.exit(1)