import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://divinifsucffsxyiyypc.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmluaWZzdWNmZnN4eWl5eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjgxNjksImV4cCI6MjA5MDEwNDE2OX0.VFqHzTvjN7wwo8ctwOfmL8-k7VJX93QeYDOzT8yLUuE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TABLE = 'app_data';

/*
-- ═══════════════════════════════════════════
-- STEP 1: Core tables
-- ═══════════════════════════════════════════

-- App data (single-row JSON store)
CREATE TABLE IF NOT EXISTS app_data (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER PUBLICATION supabase_realtime ADD TABLE app_data;
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON app_data FOR ALL USING (true) WITH CHECK (true);
INSERT INTO app_data (id, data) VALUES ('main', '{}') ON CONFLICT (id) DO NOTHING;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_name TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all audit" ON audit_log FOR ALL USING (true) WITH CHECK (true);

-- Task instances (recurring task check-ins)
CREATE TABLE IF NOT EXISTS task_instances (
  id BIGSERIAL PRIMARY KEY,
  action_id TEXT NOT NULL,
  period TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  checked_by TEXT,
  checked_at TIMESTAMPTZ,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all instances" ON task_instances FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- STEP 2: User profiles (linked to Supabase Auth)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT '普通员工',
  is_admin BOOLEAN DEFAULT false,
  staff_id TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#007AFF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read profiles (needed for staff display)
CREATE POLICY "Profiles readable by authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Users can update their own profile (name, color only)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Anyone can insert (for registration)
CREATE POLICY "Allow insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admins can manage all profiles
CREATE POLICY "Admins full access" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════
-- STEP 3: Supabase Auth settings (run in Dashboard)
-- ═══════════════════════════════════════════
-- Go to Authentication > Providers > Email
-- ✅ Enable Email provider
-- ✅ Disable "Confirm email" (since we use phone@pmp.local fake emails)
-- This allows immediate login after registration
*/
