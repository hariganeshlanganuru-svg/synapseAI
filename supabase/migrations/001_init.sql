-- ============================================================
-- SynapseAI Enterprise — Supabase PostgreSQL Schema
-- Migration: 001_init.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: profiles (extends Supabase Auth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT NOT NULL DEFAULT 'User',
    role        TEXT NOT NULL DEFAULT 'Employee'
                    CHECK (role IN ('Employee', 'HR', 'Manager', 'Admin')),
    department  TEXT NOT NULL DEFAULT 'General',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by     UUID REFERENCES public.profiles(id),
    title           TEXT NOT NULL,
    storage_path    TEXT,
    file_type       TEXT NOT NULL DEFAULT 'PDF',
    file_size       BIGINT NOT NULL DEFAULT 0,
    min_role        TEXT NOT NULL DEFAULT 'Employee'
                        CHECK (min_role IN ('Employee', 'HR', 'Manager', 'Admin')),
    status          TEXT NOT NULL DEFAULT 'INDEXED'
                        CHECK (status IN ('INDEXING', 'INDEXED', 'ERROR')),
    chunk_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: document_chunks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    chunk_text      TEXT NOT NULL,
    vector_id       TEXT,
    token_count     INTEGER DEFAULT 0
);

-- ============================================================
-- Table: messages (chat history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES public.profiles(id),
    sender              TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content             TEXT NOT NULL,
    citations           JSONB DEFAULT '[]'::jsonb,
    latency_ms          FLOAT DEFAULT 0.0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: email_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES public.profiles(id),
    recipient   TEXT NOT NULL,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'SENT'
                    CHECK (status IN ('SENT', 'SENT_LOCAL_SIMULATED', 'FAILED')),
    error_msg   TEXT,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: workflow_instances
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_instances (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES public.profiles(id),
    playbook_id         TEXT NOT NULL,
    playbook_title      TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'IN_PROGRESS'
                            CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    current_step_index  INTEGER NOT NULL DEFAULT 0,
    total_steps         INTEGER NOT NULL DEFAULT 1,
    input_payload       JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) — enable but allow service_role full access
-- ============================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Documents: visible based on role (handled in Edge Function, open read here)
CREATE POLICY "Documents viewable by authenticated users" ON public.documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert documents" ON public.documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Messages: users see only their own
CREATE POLICY "Users see own messages" ON public.messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Email logs: users see own
CREATE POLICY "Users see own email logs" ON public.email_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own email logs" ON public.email_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workflow instances: users see own
CREATE POLICY "Users see own workflows" ON public.workflow_instances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own workflows" ON public.workflow_instances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on new Supabase Auth user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, department)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Employee'),
        COALESCE(NEW.raw_user_meta_data->>'department', 'General')
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Seed demo data (safe to run multiple times)
-- ============================================================
INSERT INTO public.documents (title, file_type, file_size, min_role, status, chunk_count)
VALUES
    ('2026_Employee_Handbook.pdf',        'PDF',  2450000, 'Employee', 'INDEXED', 42),
    ('IT_Security_Policy_v4.pdf',         'PDF',  1200000, 'Employee', 'INDEXED', 18),
    ('Travel_Expense_Policy_2026.docx',   'DOCX', 850000,  'Manager',  'INDEXED', 11),
    ('Executive_Compensation_2026.pdf',   'PDF',  3100000, 'Admin',    'INDEXED', 27)
ON CONFLICT DO NOTHING;
