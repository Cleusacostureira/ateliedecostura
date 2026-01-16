-- Create compras and compras_itens tables
CREATE TABLE IF NOT EXISTS compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data text NOT NULL,
  fornecedor text NOT NULL,
  valor_total numeric(12,2) DEFAULT 0,
  forma_pagamento text,
  status text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compras_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid REFERENCES compras(id) ON DELETE CASCADE,
  produto text,
  tipo_material text,
  quantidade numeric(12,3) DEFAULT 0,
  unidade text,
  valor_unitario numeric(12,2) DEFAULT 0,
  valor_total numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compras_data ON compras(data);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor ON compras(fornecedor);
