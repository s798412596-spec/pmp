import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://divinifsucffsxyiyypc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmluaWZzdWNmZnN4eWl5eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjgxNjksImV4cCI6MjA5MDEwNDE2OX0.VFqHzTvjN7wwo8ctwOfmL8-k7VJX93QeYDOzT8yLUuE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Table name for the single-row JSON store
export const TABLE = 'app_data';

// Schema SQL to run in Supabase SQL Editor:
/*
-- Create a simple key-value store for app data
CREATE TABLE IF NOT EXISTS app_data (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_data;

-- Row Level Security (allow all for anon during development)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON app_data FOR ALL USING (true) WITH CHECK (true);

-- Audit log table
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

-- Task instances table (for recurring task check-ins)
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

-- Insert default row
INSERT INTO app_data (id, data) VALUES ('main', '{}') ON CONFLICT (id) DO NOTHING;
*/
