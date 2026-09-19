-- Fix: Allow authenticated users (like the Admin you logged in as) to fully manage data.
-- Supabase enables Row Level Security (RLS) by default in the dashboard, which blocks all reads/writes.

-- 1. Enable RLS explicitly on all tables (best practice)
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 2. Create policies allowing authenticated users to do EVERYTHING (Select, Insert, Update, Delete)
CREATE POLICY "Full access to authenticated users" ON floors FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON sections FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON space_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON students FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON spaces FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON memberships FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON attendance FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to authenticated users" ON settings FOR ALL TO authenticated USING (true);

-- 3. (Optional) Allow public read access to settings if needed before login
CREATE POLICY "Public read settings" ON settings FOR SELECT TO anon USING (true);
