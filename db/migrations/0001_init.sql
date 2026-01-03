-- Initial schema for Cleusa Ateliê de Costura
-- Target: PostgreSQL (Supabase)

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text,
  name text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf_cnpj text,
  email text,
  telefone text,
  endereco text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Serviços
CREATE TABLE IF NOT EXISTS servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  preco numeric(12,2) NOT NULL DEFAULT 0,
  duracao_minutos integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ordens (pedidos)
CREATE TABLE IF NOT EXISTS ordens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  total numeric(12,2) NOT NULL DEFAULT 0,
  data_criacao timestamptz NOT NULL DEFAULT now(),
  data_entrega timestamptz,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Itens de ordem (relaciona ordens e serviços)
CREATE TABLE IF NOT EXISTS ordem_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
  servico_id uuid REFERENCES servicos(id) ON DELETE SET NULL,
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0
);

-- Pagamentos / financeiro
CREATE TABLE IF NOT EXISTS pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid REFERENCES ordens(id) ON DELETE SET NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  metodo text,
  status text NOT NULL DEFAULT 'pending',
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disparos (notificações / envios)
CREATE TABLE IF NOT EXISTS disparos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text,
  payload jsonb,
  agendado_para timestamptz,
  enviado boolean DEFAULT false,
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Configurações gerais
CREATE TABLE IF NOT EXISTS configuracoes (
  chave text PRIMARY KEY,
  valor jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Relatórios salvos
CREATE TABLE IF NOT EXISTS relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  parametros jsonb,
  criado_por uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_ordens_cliente_id ON ordens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_usuario_id ON ordens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_ordem_id ON pagamentos(ordem_id);

-- Trigger to update updated_at timestamps (simple example)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers exist: drop if present then create (avoids dollar-quoting issues)
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_clientes ON clientes;
CREATE TRIGGER set_timestamp_clientes BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_servicos ON servicos;
CREATE TRIGGER set_timestamp_servicos BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_ordens ON ordens;
CREATE TRIGGER set_timestamp_ordens BEFORE UPDATE ON ordens FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Materiais (inventário/consumíveis)
CREATE TABLE IF NOT EXISTS materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade text,
  preco numeric(12,2) NOT NULL DEFAULT 0,
  estoque numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_timestamp_materiais ON materiais;
CREATE TRIGGER set_timestamp_materiais BEFORE UPDATE ON materiais FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- End of migration
