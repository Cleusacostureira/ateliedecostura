-- Add paymentStatus column to ordens so payment state can be persisted
BEGIN;

-- Add a nullable text column to store payment status (e.g. 'Pago', 'Pendente')
ALTER TABLE ordens
  ADD COLUMN IF NOT EXISTS "paymentStatus" text;

COMMIT;

-- End of migration
