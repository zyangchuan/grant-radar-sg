
import os
import sys
from dotenv import load_dotenv
from google.cloud.alloydb.connector import Connector, IPTypes
import pg8000

# Load env
load_dotenv()

ALLOYDB_DB_USER = os.environ.get("ALLOYDB_DB_USER", "postgres")
ALLOYDB_DB_PASS = os.environ.get("ALLOYDB_DB_PASS")
ALLOYDB_DB_NAME = os.environ.get("ALLOYDB_DB_NAME", "grantsmapsgdb")
ALLOYDB_REGION = os.environ.get("ALLOYDB_REGION", "asia-southeast1")
ALLOYDB_CLUSTER = os.environ.get("ALLOYDB_CLUSTER", "grantmapsgdb")
ALLOYDB_INSTANCE = os.environ.get("ALLOYDB_INSTANCE", "grantmapsgdb-primary")
PROJECT_ID = os.environ.get("GCP_PROJECT_ID")

target = f"projects/{PROJECT_ID}/locations/{ALLOYDB_REGION}/clusters/{ALLOYDB_CLUSTER}/instances/{ALLOYDB_INSTANCE}"

print(f"Target: {target}")
print(f"User: {ALLOYDB_DB_USER}")
print(f"Pass: {ALLOYDB_DB_PASS[:3]}***")

print("Initializing Connector (lazy)...")
connector = Connector(refresh_strategy="lazy")

print("Connecting...")
try:
    conn = connector.connect(
        target,
        "pg8000",
        user=ALLOYDB_DB_USER,
        password=ALLOYDB_DB_PASS,
        db=ALLOYDB_DB_NAME,
        ip_type=IPTypes.PUBLIC,
        enable_iam_auth=False,
    )
    print("SUCCESS: Connected!")
    
    # Test query
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    res = cursor.fetchone()
    print(f"Query Result: {res}")
    conn.close()
    
except Exception as e:
    print(f"FAILED: {e}")
    # Print more details if available
    import traceback
    traceback.print_exc()
