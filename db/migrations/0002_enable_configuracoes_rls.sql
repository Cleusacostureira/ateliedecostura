-- Migration: enable RLS and create basic policies for configuracoes
-- Target: PostgreSQL (Supabase)

-- Enable row level security
ALTER TABLE IF EXISTS public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read configuracoes (optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow select public' AND polrelid = 'public.configuracoes'::regclass) THEN
    PERFORM 1;
  ELSE
    CREATE POLICY "Allow select public" ON public.configuracoes
      FOR SELECT
      USING (true);
  END IF;
END$$;

-- Allow INSERT by authenticated users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow insert authenticated' AND polrelid = 'public.configuracoes'::regclass) THEN
    PERFORM 1;
  ELSE
    CREATE POLICY "Allow insert authenticated" ON public.configuracoes
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END$$;

-- Allow UPDATE by authenticated users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow update authenticated' AND polrelid = 'public.configuracoes'::regclass) THEN
    PERFORM 1;
  ELSE
    CREATE POLICY "Allow update authenticated" ON public.configuracoes
      FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END$$;

-- (Optional) You can add more restrictive policies later, per-column checks, or
-- require ownership fields. Run this migration in Supabase SQL Editor or via
-- the local migration runner (`npm run db:migrate:all`) using a valid
-- `DATABASE_URL` environment variable.
