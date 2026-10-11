-- ==============================================================================
-- Supabase Schema for Gemini Chatbot
-- Run this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'New Chat',
  model TEXT DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 5. Enable Row Level Security (RLS) - Defaults to open access for public anon key
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 6. Create policies allowing public anon access (or service role)
DROP POLICY IF EXISTS "Public select conversations" ON conversations;
CREATE POLICY "Public select conversations" ON conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert conversations" ON conversations;
CREATE POLICY "Public insert conversations" ON conversations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update conversations" ON conversations;
CREATE POLICY "Public update conversations" ON conversations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete conversations" ON conversations;
CREATE POLICY "Public delete conversations" ON conversations FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public select messages" ON messages;
CREATE POLICY "Public select messages" ON messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert messages" ON messages;
CREATE POLICY "Public insert messages" ON messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete messages" ON messages;
CREATE POLICY "Public delete messages" ON messages FOR DELETE USING (true);
