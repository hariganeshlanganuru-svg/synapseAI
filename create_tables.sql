-- SynapseAI Database Schema - Direct SQL Execution
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xhjektrtwvizvcqjvbux/sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'User',
    role TEXT NOT NULL DEFAULT 'Employee' CHECK (role IN ('Employee', 'HR', 'Manager', 'Admin')),
    department TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID,
    title TEXT NOT NULL,
    storage_path TEXT,
    file_type TEXT NOT NULL DEFAULT 'PDF',
    file_size BIGINT NOT NULL DEFAULT 0,
    min_role TEXT NOT NULL DEFAULT 'Employee' CHECK (min_role IN ('Employee', 'HR', 'Manager', 'Admin')),
    status TEXT NOT NULL DEFAULT 'INDEXED' CHECK (status IN ('INDEXING', 'INDEXED', 'ERROR')),
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    vector_id TEXT,
    token_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    latency_ms FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'SENT_LOCAL_SIMULATED', 'FAILED')),
    error_msg TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    playbook_id TEXT NOT NULL,
    playbook_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    current_step_index INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL DEFAULT 1,
    input_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

-- Simple policies (allow all for now)
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all on documents" ON public.documents FOR ALL USING (true);
CREATE POLICY "Allow all on chunks" ON public.document_chunks FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow all on email_logs" ON public.email_logs FOR ALL USING (true);
CREATE POLICY "Allow all on workflows" ON public.workflow_instances FOR ALL USING (true);

-- Insert demo data
INSERT INTO public.documents (title, file_type, file_size, min_role, status, chunk_count)
VALUES
    ('2026_Employee_Handbook.pdf', 'PDF', 2450000, 'Employee', 'INDEXED', 42),
    ('IT_Security_Policy_v4.pdf', 'PDF', 1200000, 'Employee', 'INDEXED', 18),
    ('Travel_Expense_Policy_2026.docx', 'DOCX', 850000, 'Manager', 'INDEXED', 11),
    ('Executive_Compensation_2026.pdf', 'PDF', 3100000, 'Admin', 'INDEXED', 27)
ON CONFLICT DO NOTHING;
