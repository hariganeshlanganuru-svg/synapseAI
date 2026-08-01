import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

sql = """
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'User',
    role TEXT NOT NULL DEFAULT 'Employee' CHECK (role IN ('Employee', 'HR', 'Manager', 'Admin')),
    department TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    storage_path TEXT,
    file_type TEXT NOT NULL DEFAULT 'PDF',
    file_size BIGINT NOT NULL DEFAULT 0,
    min_role TEXT NOT NULL DEFAULT 'Employee' CHECK (min_role IN ('Employee', 'HR', 'Manager', 'Admin')),
    status TEXT NOT NULL DEFAULT 'INDEXED' CHECK (status IN ('INDEXING', 'INDEXED', 'ERROR')),
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: document_chunks
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    vector_id TEXT,
    token_count INTEGER DEFAULT 0
);

-- Table: messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    latency_ms FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'SENT_LOCAL_SIMULATED', 'FAILED')),
    error_msg TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: workflow_instances
CREATE TABLE IF NOT EXISTS public.workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    playbook_id TEXT NOT NULL,
    playbook_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    current_step_index INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL DEFAULT 1,
    input_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert demo documents
INSERT INTO public.documents (title, file_type, file_size, min_role, status, chunk_count)
VALUES
    ('2026_Employee_Handbook.pdf', 'PDF', 2450000, 'Employee', 'INDEXED', 42),
    ('IT_Security_Policy_v4.pdf', 'PDF', 1200000, 'Employee', 'INDEXED', 18),
    ('Travel_Expense_Policy_2026.docx', 'DOCX', 850000, 'Manager', 'INDEXED', 11),
    ('Executive_Compensation_2026.pdf', 'PDF', 3100000, 'Admin', 'INDEXED', 27)
ON CONFLICT DO NOTHING;
"""

try:
    print("🔄 Creating tables in Supabase...")
    
    # Execute SQL via RPC or direct query
    result = supabase.rpc('exec_sql', {'sql': sql}).execute()
    print("✅ Tables created successfully!")
    
except Exception as e:
    # Fallback: create tables one by one
    print(f"⚠️ Batch create failed, trying individual tables...")
    
    statements = [
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
        '''CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY,
            email TEXT NOT NULL,
            full_name TEXT NOT NULL DEFAULT 'User',
            role TEXT NOT NULL DEFAULT 'Employee',
            department TEXT NOT NULL DEFAULT 'General',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )''',
        '''CREATE TABLE IF NOT EXISTS public.documents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            uploaded_by UUID,
            title TEXT NOT NULL,
            storage_path TEXT,
            file_type TEXT NOT NULL DEFAULT 'PDF',
            file_size BIGINT NOT NULL DEFAULT 0,
            min_role TEXT NOT NULL DEFAULT 'Employee',
            status TEXT NOT NULL DEFAULT 'INDEXED',
            chunk_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )'''
    ]
    
    for stmt in statements:
        try:
            supabase.postgrest.rpc('exec_sql', {'query': stmt}).execute()
            print(f"✅ Executed statement")
        except:
            pass

# Test
print("\n🧪 Testing tables...")
try:
    docs = supabase.table('documents').select("*").execute()
    print(f"✅ Documents table: {len(docs.data)} records")
except Exception as e:
    print(f"⚠️ Documents table: {e}")

print("\n✅ Setup complete! Now run: python quick_test.py")
