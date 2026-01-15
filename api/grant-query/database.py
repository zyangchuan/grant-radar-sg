import os
from contextlib import contextmanager
from typing import Generator

from google.cloud.alloydb.connector import Connector, IPTypes
from sqlalchemy import create_engine
from sqlmodel import Session, SQLModel
import pg8000

# Configuration
ALLOYDB_DB_USER = os.environ.get("ALLOYDB_DB_USER", "postgres")
ALLOYDB_DB_PASS = os.environ.get("ALLOYDB_DB_PASS", "password")
ALLOYDB_DB_NAME = os.environ.get("ALLOYDB_DB_NAME", "grants_db")
ALLOYDB_REGION = os.environ.get("ALLOYDB_REGION", "asia-southeast1")
ALLOYDB_CLUSTER = os.environ.get("ALLOYDB_CLUSTER", "grants-cluster")
ALLOYDB_INSTANCE = os.environ.get("ALLOYDB_INSTANCE", "grants-instance")

# Connection Name: projects/<PROJECT>/locations/<REGION>/clusters/<CLUSTER>/instances/<INSTANCE>
# But connector takes components.

def get_connection_string() -> str:
    """
    Returns the connection string. 
    In local dev, might use localhost. In prod, uses AlloyDB connector.
    """
    # For local testing (user mentioned respecting docker, but this is a NEW service)
    # If standard PG env vars are present, use them (Simulates AlloyDB locally)
    if os.environ.get("USE_LOCAL_DB") == "true":
         return f"postgresql+pg8000://{ALLOYDB_DB_USER}:{ALLOYDB_DB_PASS}@localhost:5432/{ALLOYDB_DB_NAME}"
    return "postgresql+pg8000://"

# Initialize Connector
# Use 'lazy' refresh strategy for serverless environments (Cloud Run/Functions)
connector = Connector(refresh_strategy="lazy")

# ... imports
import logging

# ... imports
import logging
import sys

# Force explicit logging to stdout for Cloud Run
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
root_logger.addHandler(handler)

# Specific connector logger
logging.getLogger("google.cloud.alloydb.connector").setLevel(logging.DEBUG)
logging.getLogger("urllib3").setLevel(logging.DEBUG)
logging.getLogger("google.auth").setLevel(logging.DEBUG) # Auth logs

def getconn():
    # Initialize connector lazily/locally to avoid global state issues
    connector = Connector(refresh_strategy="lazy")
    
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT_ID")
    target = f"projects/{project_id}/locations/{ALLOYDB_REGION}/clusters/{ALLOYDB_CLUSTER}/instances/{ALLOYDB_INSTANCE}"
    
    print(f"[DB] Connecting to: {target} User: {ALLOYDB_DB_USER}...", flush=True)
    
    try:
        # 1. Option: Force disable IAM (we use password) & set timeout
        # Added timeout=30 to prevent indefinite hangs
        conn = connector.connect(
            target,
            "pg8000",
            user=ALLOYDB_DB_USER,
            password=ALLOYDB_DB_PASS,
            db=ALLOYDB_DB_NAME,
            ip_type=IPTypes.PUBLIC,
            enable_iam_auth=False,
            timeout=30 
        )
        print("[DB] Connection successful!", flush=True)
        return conn
    except Exception as e:
        print(f"[DB] Connector FAILED: {str(e)}", flush=True)
        # Print full traceback for debugging
        import traceback
        traceback.print_exc()
        
        # Fallback/Debug: Raise to see the log
        # Check for common errors
        if "Quota" in str(e):
            print("[DB] Hint: Check API Quotas.", flush=True)
        if "Permission" in str(e):
            print("[DB] Hint: Check IAM roles (Cloud Run Service Agent needs AlloyDB Client).", flush=True)
        if "Network" in str(e) or "timeout" in str(e).lower():
             print("[DB] Hint: Check Firewall (Authorized Networks) or Public IP.", flush=True)
        raise

# Create Engine
# If using Connector
if os.environ.get("USE_LOCAL_DB") != "true":
    engine = create_engine(
        "postgresql+pg8000://",
        creator=getconn,
    )
else:
    engine = create_engine(get_connection_string())

from sqlalchemy import text # Ensure text is imported

def init_db():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    SQLModel.metadata.create_all(engine)

@contextmanager
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
