-- Migration: 20261011000000_create_chat_schema.sql
-- Description: Create conversations and messages tables with indexes and RLS policies

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'New Chat',
  model TEXT DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
DROP POLICY IF EXISTS "Public select conversations" ON public.conversations;
CREATE POLICY "Public select conversations" ON public.conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert conversations" ON public.conversations;
CREATE POLICY "Public insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update conversations" ON public.conversations;
CREATE POLICY "Public update conversations" ON public.conversations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete conversations" ON public.conversations;
CREATE POLICY "Public delete conversations" ON public.conversations FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public select messages" ON public.messages;
CREATE POLICY "Public select messages" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
CREATE POLICY "Public insert messages" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete messages" ON public.messages;
CREATE POLICY "Public delete messages" ON public.messages FOR DELETE USING (true);
