-- Cria a tabela `fluxo_caixa` para lançamentos financeiros
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text,
  client text,
  service text,
  value numeric(12,2) DEFAULT 0,
  status text,
  orderid uuid,
  numero text,
  pecas jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas por pedido/numero
CREATE INDEX IF NOT EXISTS idx_fluxo_orderid ON fluxo_caixa(orderid);
CREATE INDEX IF NOT EXISTS idx_fluxo_numero ON fluxo_caixa(numero);
