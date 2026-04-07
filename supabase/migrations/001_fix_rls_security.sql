-- ═══════════════════════════════════════════════════════════════
-- SECURITY FIX: Replace all "Allow all" RLS policies with proper auth-based policies
-- ⚠️ Run this in Supabase SQL Editor manually when ready
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. app_data: Only authenticated users can read/write ───
DROP POLICY IF EXISTS "Allow all" ON app_data;

-- Authenticated users can read
CREATE POLICY "Authenticated read app_data" ON app_data
  FOR SELECT TO authenticated USING (true);

-- Only admins can write (insert/update/delete)
CREATE POLICY "Admin write app_data" ON app_data
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admin update app_data" ON app_data
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admin delete app_data" ON app_data
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 2. profiles: Users can only read/write their own profile ───
DROP POLICY IF EXISTS "Allow all" ON profiles;

CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins read all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ─── 3. storage: Restrict to authenticated users ───
-- Run these if you have a storage bucket named 'assets'
-- DROP POLICY IF EXISTS "Allow all" ON storage.objects;
-- CREATE POLICY "Authenticated access" ON storage.objects
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);
