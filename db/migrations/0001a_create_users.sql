-- Migration: create users table only (idempotent)
-- Target: PostgreSQL (Supabase)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- create users table if missing
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text,
  name text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ensure the user exists (replace role/name as needed)
INSERT INTO public.users (id, email, name, role)
VALUES (
  'ff174d63-0fa2-451f-be62-e2dbbfebf557',
  'cleusaateliedecostura@gmail.com',
  'Cleusa',
  'user'
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = now();

-- Useful check
-- SELECT id, email, created_at FROM auth.users WHERE email = 'cleusaateliedecostura@gmail.com';
