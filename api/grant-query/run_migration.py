"""
Run this script to apply the database migration.
Usage: python run_migration.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

# dotenv is optional
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from database import engine
from sqlalchemy import text

MIGRATION_SQL = """
ALTER TABLE grants ADD COLUMN IF NOT EXISTS deadline VARCHAR(100);
ALTER TABLE organizations DROP COLUMN IF EXISTS registration_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS organization_website;
ALTER TABLE organizations DROP COLUMN IF EXISTS mailing_address;
"""


def run_migration():
    print("Connecting to AlloyDB...", flush=True)
    with engine.connect() as conn:
        print("Running migration...", flush=True)
        for statement in MIGRATION_SQL.strip().split(';'):
            stmt = statement.strip()
            if stmt and not stmt.startswith('--'):
                print(f"  Executing: {stmt[:60]}...", flush=True)
                conn.execute(text(stmt))
        conn.commit()
        print("✅ Migration complete!", flush=True)
        
        # Verify
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'grants' AND column_name = 'deadline'
        """))
        if result.fetchone():
            print("✅ Verified: 'deadline' column exists in grants table")
        else:
            print("⚠️ Warning: 'deadline' column not found")

if __name__ == "__main__":
    run_migration()
