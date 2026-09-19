-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Floors
CREATE TABLE floors (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Sections
CREATE TABLE sections (
  id text PRIMARY KEY,
  floor_id text REFERENCES floors(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Space Types
CREATE TABLE space_types (
  id text PRIMARY KEY,
  name text NOT NULL,
  default_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Students
CREATE TABLE students (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text,
  joining_date date NOT NULL,
  emergency_contact text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 5. Spaces
CREATE TABLE spaces (
  id text PRIMARY KEY,
  number text NOT NULL,
  floor_id text REFERENCES floors(id) ON DELETE CASCADE,
  section_id text REFERENCES sections(id) ON DELETE CASCADE,
  type_id text REFERENCES space_types(id) ON DELETE CASCADE,
  status text NOT NULL, -- 'available', 'occupied', 'reserved', 'maintenance'
  price numeric NOT NULL,
  student_id text REFERENCES students(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 6. Plans
CREATE TABLE plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  days integer NOT NULL,
  price numeric NOT NULL,
  allowed_type_id text NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. Memberships
CREATE TABLE memberships (
  id text PRIMARY KEY,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  plan_id text REFERENCES plans(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  expiry_date date NOT NULL,
  amount numeric NOT NULL,
  payment_status text NOT NULL, -- 'paid', 'pending', 'overdue', 'partial'
  created_at timestamptz DEFAULT now()
);

-- 8. Payments
CREATE TABLE payments (
  id text PRIMARY KEY,
  receipt_id text NOT NULL UNIQUE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  membership_id text REFERENCES memberships(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  method text NOT NULL, -- 'Cash', 'UPI', 'Bank Transfer', 'Other'
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 9. Attendance
CREATE TABLE attendance (
  id text PRIMARY KEY,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  space_id text REFERENCES spaces(id) ON DELETE SET NULL,
  check_in timestamptz NOT NULL,
  check_out timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 10. Settings (Singleton pattern)
CREATE TABLE settings (
  id integer PRIMARY KEY DEFAULT 1,
  library_name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  owner_name text NOT NULL,
  opening_hours text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert Default Settings
INSERT INTO settings (id, library_name, address, phone, email, owner_name, opening_hours)
VALUES (1, 'Vision Library', 'Nehru Chowk, Chapra, Bihar 841301', '+91 98350 42117', 'visionlibrary.chapra@gmail.com', 'Anil Verma', '6:00 AM – 10:00 PM');
