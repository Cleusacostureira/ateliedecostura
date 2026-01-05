
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
-- Criar sequência para numeração das ordens, se ainda não existir
CREATE SEQUENCE IF NOT EXISTS ordens_numero_seq START 1;

ALTER TABLE ordens ADD COLUMN IF NOT EXISTS numero bigint UNIQUE DEFAULT nextval('ordens_numero_seq');

-- End of migration

  -- Tabela de peças pré-cadastradas (tipos de peça)
  CREATE TABLE IF NOT EXISTS pecas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    categoria text,
    icone text,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Inserir tipos de peça padrão (se ainda não existirem)
  INSERT INTO pecas (nome, categoria, icone)
  SELECT * FROM (VALUES
    ('Camiseta','ROUPAS SUPERIORES','👕'),
    ('Camisa social','ROUPAS SUPERIORES','👔'),
    ('Camisa polo','ROUPAS SUPERIORES','👕'),
    ('Blusa','ROUPAS SUPERIORES','👕'),
    ('Cropped','ROUPAS SUPERIORES','👕'),
    ('Regata','ROUPAS SUPERIORES','👕'),
    ('Bata','ROUPAS SUPERIORES','👕'),
    ('Top','ROUPAS SUPERIORES','👕'),
    ('Moletom','ROUPAS SUPERIORES','👕'),
    ('Casaco','ROUPAS SUPERIORES','🧥'),
    ('Jaqueta','ROUPAS SUPERIORES','🧥'),
    ('Blazer','ROUPAS SUPERIORES','🧥'),
    ('Colete','ROUPAS SUPERIORES','🧥'),

    ('Calça jeans','ROUPAS INFERIORES','👖'),
    ('Calça social','ROUPAS INFERIORES','👖'),
    ('Calça de alfaiataria','ROUPAS INFERIORES','👖'),
    ('Calça legging','ROUPAS INFERIORES','👖'),
    ('Calça moletom','ROUPAS INFERIORES','👖'),
    ('Bermuda','ROUPAS INFERIORES','🩳'),
    ('Short','ROUPAS INFERIORES','🩳'),
    ('Saia curta','ROUPAS INFERIORES','👗'),
    ('Saia média','ROUPAS INFERIORES','👗'),
    ('Saia longa','ROUPAS INFERIORES','👗'),

    ('Vestido curto','VESTIDOS E PEÇAS ÚNICAS','👗'),
    ('Vestido médio','VESTIDOS E PEÇAS ÚNICAS','👗'),
    ('Vestido longo','VESTIDOS E PEÇAS ÚNICAS','👗'),
    ('Vestido de festa','VESTIDOS E PEÇAS ÚNICAS','👗'),
    ('Vestido social','VESTIDOS E PEÇAS ÚNICAS','👗'),
    ('Macacão','VESTIDOS E PEÇAS ÚNICAS','👗'),
    ('Macaquinho','VESTIDOS E PEÇAS ÚNICAS','👗'),
    ('Jardineira','VESTIDOS E PEÇAS ÚNICAS','👗'),

    ('Casaco pesado','ROUPAS DE FRIO / EXTERNAS','🧥'),
    ('Sobretudo','ROUPAS DE FRIO / EXTERNAS','🧥'),
    ('Jaqueta jeans','ROUPAS DE FRIO / EXTERNAS','🧥'),
    ('Jaqueta de couro','ROUPAS DE FRIO / EXTERNAS','🧥'),
    ('Parka','ROUPAS DE FRIO / EXTERNAS','🧥'),
    ('Capa','ROUPAS DE FRIO / EXTERNAS','🧥'),

    ('Lingerie','ROUPAS ÍNTIMAS / LEVES','🩲'),
    ('Sutiã','ROUPAS ÍNTIMAS / LEVES','🩲'),
    ('Calcinha','ROUPAS ÍNTIMAS / LEVES','🩲'),
    ('Cueca','ROUPAS ÍNTIMAS / LEVES','🩲'),
    ('Pijama','ROUPAS ÍNTIMAS / LEVES','🛌'),
    ('Camisola','ROUPAS ÍNTIMAS / LEVES','🛌'),
    ('Baby doll','ROUPAS ÍNTIMAS / LEVES','🛌'),

    ('Body infantil','ROUPAS INFANTIS','👶'),
    ('Conjunto infantil','ROUPAS INFANTIS','👶'),
    ('Camiseta infantil','ROUPAS INFANTIS','👶'),
    ('Calça infantil','ROUPAS INFANTIS','👶'),
    ('Vestido infantil','ROUPAS INFANTIS','👶'),
    ('Short infantil','ROUPAS INFANTIS','👶'),

    ('Uniforme escolar','ROUPAS ESPECIAIS','🎓'),
    ('Uniforme profissional','ROUPAS ESPECIAIS','🎓'),
    ('Roupa hospitalar','ROUPAS ESPECIAIS','🎓'),
    ('Jaleco','ROUPAS ESPECIAIS','🎓'),
    ('Avental','ROUPAS ESPECIAIS','🎓'),
    ('Roupa esportiva','ROUPAS ESPECIAIS','🏃'),
    ('Roupa de academia','ROUPAS ESPECIAIS','🏃'),

    ('Barra de cortina','ACESSÓRIOS EM TECIDO','🧵'),
    ('Cortina','ACESSÓRIOS EM TECIDO','🧵'),
    ('Capa de almofada','ACESSÓRIOS EM TECIDO','🧵'),
    ('Fronha','ACESSÓRIOS EM TECIDO','🧵'),
    ('Lençol','ACESSÓRIOS EM TECIDO','🛏️'),
    ('Colcha','ACESSÓRIOS EM TECIDO','🛏️'),
    ('Toalha','ACESSÓRIOS EM TECIDO','🧺'),
    ('Guardanapo de tecido','ACESSÓRIOS EM TECIDO','🍽️')
  ) AS t(nome, categoria, icone)
  WHERE NOT EXISTS (SELECT 1 FROM pecas p WHERE p.nome = t.nome);
