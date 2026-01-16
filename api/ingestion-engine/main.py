from firebase_functions import https_fn, options
from firebase_admin import initialize_app
import asyncio
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from services.ingestor import ingest_grant
from database import init_db, get_session
from models import Grant
from subscription_model import Subscription
from email_service import send_grant_notification
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Initialize Firebase Admin
initialize_app()

# Global flag for lazy initialization (avoids DB connect during deploy verification)
_db_initialized = False


async def send_notifications_for_grant(grant_id: str):
    """
    Find matching subscriptions and send email notifications for a new grant.
    """
    print(f"[Notify] Processing notifications for grant: {grant_id}", flush=True)
    
    with get_session() as session:
        # Get the grant
        grant = session.get(Grant, grant_id)
        if not grant:
            print(f"[Notify] Grant {grant_id} not found", flush=True)
            return
        
        # Find matching subscriptions using vector similarity
        sql = text("""
            SELECT s.id, s.email, s.organization_name,
                   1 - (s.preference_embedding <=> g.embedding) as similarity
            FROM subscriptions s
            CROSS JOIN grants g
            WHERE s.is_active = TRUE 
              AND g.id = :grant_id
              AND s.preference_embedding IS NOT NULL
              AND (1 - (s.preference_embedding <=> g.embedding)) > 0.5
            ORDER BY similarity DESC
        """)
        
        matches = session.execute(sql, {"grant_id": grant_id}).fetchall()
        print(f"[Notify] Found {len(matches)} matching subscriptions", flush=True)
        
        # Send emails to matching subscribers
        emails_sent = 0
        for match in matches:
            sub_id, email, org_name, similarity = match
            
            print(f"[Notify] Sending to {email} (similarity: {similarity:.2f})", flush=True)
            
            grant_data = {
                "name": grant.name,
                "agency_name": grant.agency_name,
                "max_funding": grant.max_funding,
                "strategic_intent": grant.strategic_intent,
                "original_url": grant.original_url
            }
            
            if send_grant_notification(email, org_name, [grant_data]):
                emails_sent += 1
                
                # Update last_notified_at
                sub = session.get(Subscription, sub_id)
                if sub:
                    sub.last_notified_at = datetime.utcnow()
                    session.add(sub)
        
        session.commit()
        print(f"[Notify] Sent {emails_sent} emails for grant {grant_id}", flush=True)

def determine_is_open_from_source(grant_data):
    """
    Determines is_open directly from the source API data.
    Uses closing_dates and available fields.
    """
    closing_dates = grant_data.get("closing_dates", {})
    available = grant_data.get("available", {})
    
    # If any closing_dates value contains "open", it's open
    for key, status_text in closing_dates.items():
        if status_text and "open" in str(status_text).lower():
            return True
    
    # If any available field is True, it's open
    for key, is_available in available.items():
        if is_available:
            return True
            
    # If we have closing_dates but none say open, assume closed
    if closing_dates:
        return False
    
    # Default to open if no data
    return True

def is_recently_updated(updated_at_str, days=14):
    """
    Check if the grant was updated within the last N days.
    """
    if not updated_at_str:
        return True  # No date = assume needs processing
    
    try:
        updated_at = datetime.strptime(updated_at_str, "%Y-%m-%d")
        cutoff = datetime.now() - timedelta(days=days)
        return updated_at >= cutoff
    except:
        return True  # Parse error = assume needs processing


@https_fn.on_request(
    timeout_sec=540, 
    memory=options.MemoryOption.GB_2,
    region="asia-southeast1"
)
def trigger_ingestion(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP Trigger for Ingestion.
    Supports GET for Health Check, POST for Action.
    """
    print(f"[System] Request received: {req.method} {req.path}", flush=True)

    # 0. Health Check
    if req.method == "GET":
        project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT_ID", "UNKNOWN")
        return https_fn.Response(f"Ingestion Engine Ready. Project: {project}", status=200)

    # Lazy Init DB
    global _db_initialized
    if not _db_initialized:
        try:
            print("[System] Initializing Database...", flush=True)
            init_db()
            print("[System] Database initialized.", flush=True)
            _db_initialized = True
        except Exception as e:
            print(f"[System] FATAL: Database init failed: {e}", flush=True)
            return https_fn.Response(f"Database unavailable: {e}", status=500)

    # 1. Fetch from Source API
    SOURCE_API = "https://oursggrants.gov.sg/api/v1/grant_metadata/explore_grants"
    print(f"[System] Fetching grants from {SOURCE_API}...", flush=True)
    
    try:
        import requests
        resp = requests.get(SOURCE_API, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        all_grants = data.get("grant_metadata", [])
    except Exception as e:
        print(f"[Error] Failed to fetch source: {e}")
        return https_fn.Response(json.dumps({"error": str(e)}), status=500)

    # 2. Get existing grant IDs from database for comparison
    existing_grant_ids = set()
    try:
        with get_session() as session:
            from sqlmodel import select
            results = session.exec(select(Grant.id)).all()
            existing_grant_ids = set(results)
    except Exception as e:
        print(f"[Warn] Could not fetch existing grants: {e}")

    # 3. Categorize grants
    grants_to_process = []      # Full AI processing needed
    grants_to_update_status = [] # Just update is_open, no AI needed
    
    for g in all_grants:
        gid = str(g.get("id"))
        slug = g.get("value")
        url = g.get("original_url") or g.get("deactivation_url") or g.get("call_to_action_url")
        updated_at = g.get("updated_at")
        
        if not gid or not slug:
            continue
            
        # Calculate is_open from source data
        is_open = determine_is_open_from_source(g)
        
        if gid in existing_grant_ids:
            # Grant exists - just update is_open status (fast path)
            grants_to_update_status.append({
                "id": gid,
                "is_open": is_open,
                "closing_dates": g.get("closing_dates")
            })
        else:
            # New grant - needs full processing
            if is_recently_updated(updated_at, days=14):
                grants_to_process.append({"id": gid, "url": url, "slug": slug})
            else:
                print(f"[Skip] {gid} not recently updated ({updated_at})")

    print(f"[System] New grants to ingest: {len(grants_to_process)}")
    print(f"[System] Existing grants to update status: {len(grants_to_update_status)}")

    # 4. Batch update is_open for existing grants (fast, no AI)
    updated_count = 0
    try:
        with get_session() as session:
            for g in grants_to_update_status:
                stmt = (
                    Grant.__table__.update()
                    .where(Grant.id == g["id"])
                    .values(is_open=g["is_open"])
                )
                session.exec(stmt)
            session.commit()
            updated_count = len(grants_to_update_status)
            print(f"[System] Updated is_open for {updated_count} existing grants")
    except Exception as e:
        print(f"[Error] Failed to batch update is_open: {e}")

    # 5. Process new grants with full AI pipeline
    if not grants_to_process:
        return https_fn.Response(json.dumps({
            "success": True,
            "new_processed": 0,
            "status_updated": updated_count,
            "message": "No new grants to process"
        }), status=200)

    async def process_batch():
        semaphore = asyncio.Semaphore(10)
        
        async def protected_ingest(grant):
            async with semaphore:
                slug = grant.get("slug")
                url = grant.get("url")
                gid = grant.get("id")
                
                if slug and gid:
                    print(f"[Core] Starting ingest for {gid} ({slug})...", flush=True)
                    success = await ingest_grant(gid, slug, url)
                    
                    # Send email notifications for new grant directly
                    if success:
                        try:
                            await send_notifications_for_grant(gid)
                        except Exception as e:
                            print(f"[Notify] Failed to send notifications: {e}", flush=True)
                    
                    return success
                return False

        results = await asyncio.gather(*[protected_ingest(g) for g in grants_to_process])
        return results

    results = asyncio.run(process_batch())
    success_count = sum(1 for r in results if r)
    
    return https_fn.Response(json.dumps({
        "success": True,
        "new_processed": len(grants_to_process),
        "new_succeeded": success_count,
        "new_failed": len(grants_to_process) - success_count,
        "status_updated": updated_count
    }), status=200)
