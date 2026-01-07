-- Migration: update existing 'draft' statuses to 'Recebido' and change default
BEGIN;

-- update existing rows
UPDATE ordens
SET status = 'Recebido'
WHERE status = 'draft';

-- change default for new rows
ALTER TABLE ordens
ALTER COLUMN status SET DEFAULT 'Recebido';

COMMIT;

-- End of migration
