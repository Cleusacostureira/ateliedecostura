-- Add `tipo` column to fluxo_caixa so compras can be marked as despesas
ALTER TABLE IF EXISTS fluxo_caixa
	ADD COLUMN IF NOT EXISTS tipo text;