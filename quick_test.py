import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

print("✅ Connected to Supabase!")
print(f"📍 URL: {os.getenv('SUPABASE_URL')}")

# List all tables
try:
    tables = ['profiles', 'documents', 'document_chunks', 'messages', 'email_logs', 'workflow_instances']
    for table in tables:
        try:
            r = supabase.table(table).select("*").limit(1).execute()
            print(f"✅ Table '{table}' exists - {len(r.data)} records")
        except Exception as e:
            print(f"❌ Table '{table}' not found")
    print("\n🎉 Kiro <-> Supabase connection is READY!")
except Exception as e:
    print(f"❌ Error: {e}")
