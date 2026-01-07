/* eslint-env node */
/* global process, console */
// scripts/seed_db.js
// Uso: defina DATABASE_URL e rode: node scripts/seed_db.js

import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) {
  console.error('Erro: defina DATABASE_URL no .env.local ou no ambiente');
  process.exit(1);
}

const services = [
  { category: 'barras', name: 'Barra simples de calça', price: 35, time: '30 min', count: 45 },
  { category: 'barras', name: 'Barra italiana', price: 45, time: '45 min', count: 28 },
  { category: 'barras', name: 'Barra original (jeans)', price: 50, time: '60 min', count: 32 },
  { category: 'barras', name: 'Barra de saia', price: 30, time: '30 min', count: 18 },
  { category: 'barras', name: 'Barra de vestido', price: 40, time: '45 min', count: 22 },
  { category: 'barras', name: 'Barra de cortina', price: 25, time: '30 min', count: 12 },
  { category: 'ajustes', name: 'Ajuste de cintura', price: 45, time: '45 min', count: 38 },
  { category: 'ajustes', name: 'Ajuste de quadril', price: 50, time: '60 min', count: 25 },
  { category: 'ajustes', name: 'Ajuste de lateral', price: 55, time: '60 min', count: 20 },
  { category: 'ajustes', name: 'Ajuste de comprimento', price: 40, time: '45 min', count: 30 },
  { category: 'ajustes', name: 'Ajuste de manga', price: 35, time: '30 min', count: 22 },
  { category: 'ajustes', name: 'Ajuste de ombro', price: 45, time: '45 min', count: 15 },
  { category: 'ajustes', name: 'Ajuste geral', price: 80, time: '90 min', count: 18 },
  { category: 'camisas', name: 'Ajuste de camisa social', price: 50, time: '60 min', count: 24 },
  { category: 'camisas', name: 'Encurtar manga', price: 30, time: '30 min', count: 20 },
  { category: 'camisas', name: 'Apertar manga', price: 35, time: '45 min', count: 16 },
  { category: 'camisas', name: 'Troca de colarinho', price: 40, time: '45 min', count: 8 },
  { category: 'camisas', name: 'Troca de punho', price: 35, time: '30 min', count: 10 },
  { category: 'vestidos', name: 'Ajuste de vestido', price: 80, time: '90 min', count: 35 },
  { category: 'vestidos', name: 'Ajuste de alça', price: 30, time: '30 min', count: 18 },
  { category: 'vestidos', name: 'Ajuste de busto', price: 50, time: '60 min', count: 22 },
  { category: 'vestidos', name: 'Ajuste de cintura', price: 45, time: '45 min', count: 28 },
  { category: 'vestidos', name: 'Ajuste de comprimento', price: 40, time: '45 min', count: 20 },
  { category: 'vestidos', name: 'Reforma completa', price: 150, time: '180 min', count: 8 },
  { category: 'saia-short', name: 'Ajuste de saia', price: 40, time: '45 min', count: 15 },
  { category: 'saia-short', name: 'Ajuste de short', price: 35, time: '30 min', count: 12 },
  { category: 'saia-short', name: 'Ajuste de bermuda', price: 35, time: '30 min', count: 10 },
  { category: 'saia-short', name: 'Troca de zíper', price: 45, time: '45 min', count: 18 },
  { category: 'saia-short', name: 'Ajuste de cós', price: 40, time: '45 min', count: 14 },
  { category: 'calcas', name: 'Ajuste de calça social', price: 50, time: '60 min', count: 25 },
  { category: 'calcas', name: 'Ajuste de jeans', price: 55, time: '60 min', count: 30 },
  { category: 'calcas', name: 'Troca de zíper de calça', price: 45, time: '45 min', count: 22 },
  { category: 'calcas', name: 'Troca de botão', price: 15, time: '15 min', count: 35 },
  { category: 'calcas', name: 'Reforço de costura', price: 30, time: '30 min', count: 18 },
  { category: 'calcas', name: 'Reparo em rasgo', price: 40, time: '45 min', count: 20 },
  { category: 'casacos', name: 'Ajuste de jaqueta', price: 70, time: '90 min', count: 12 },
  { category: 'casacos', name: 'Ajuste de casaco', price: 80, time: '90 min', count: 10 },
  { category: 'casacos', name: 'Troca de forro', price: 90, time: '120 min', count: 8 },
  { category: 'casacos', name: 'Ajuste de manga', price: 50, time: '60 min', count: 15 },
  { category: 'casacos', name: 'Troca de zíper de jaqueta', price: 60, time: '60 min', count: 12 },
  { category: 'consertos', name: 'Troca de zíper', price: 45, time: '45 min', count: 40 },
  { category: 'consertos', name: 'Troca de botão', price: 15, time: '15 min', count: 50 },
  { category: 'consertos', name: 'Aplicação de botão', price: 20, time: '20 min', count: 30 },
  { category: 'consertos', name: 'Reforço de costura', price: 30, time: '30 min', count: 25 },
  { category: 'consertos', name: 'Bainha', price: 25, time: '30 min', count: 35 },
  { category: 'consertos', name: 'Conserto de rasgo', price: 40, time: '45 min', count: 28 },
  { category: 'consertos', name: 'Pregar colchete', price: 15, time: '15 min', count: 20 },
  { category: 'consertos', name: 'Ajuste de elástico', price: 30, time: '30 min', count: 18 },
  { category: 'sociais', name: 'Ajuste de terno', price: 120, time: '120 min', count: 8 },
  { category: 'sociais', name: 'Ajuste de paletó', price: 90, time: '90 min', count: 12 },
  { category: 'sociais', name: 'Ajuste de blazer', price: 85, time: '90 min', count: 15 },
  { category: 'sociais', name: 'Ajuste de colete', price: 60, time: '60 min', count: 6 },
  { category: 'sociais', name: 'Ajuste de calça social', price: 50, time: '60 min', count: 20 },
  { category: 'infantis', name: 'Ajuste de roupa infantil', price: 30, time: '30 min', count: 25 },
  { category: 'infantis', name: 'Barra infantil', price: 20, time: '20 min', count: 30 },
  { category: 'infantis', name: 'Conserto geral infantil', price: 35, time: '45 min', count: 18 },
  { category: 'domestica', name: 'Barra de cortina', price: 25, time: '30 min', count: 15 },
  { category: 'domestica', name: 'Ajuste de toalha', price: 20, time: '20 min', count: 10 },
  { category: 'domestica', name: 'Ajuste de capa de almofada', price: 30, time: '30 min', count: 12 },
  { category: 'domestica', name: 'Conserto de roupa de cama', price: 35, time: '45 min', count: 8 },
  { category: 'especiais', name: 'Reforma completa de roupa', price: 150, time: '180 min', count: 10 },
  { category: 'especiais', name: 'Customização', price: 100, time: '120 min', count: 12 },
  { category: 'especiais', name: 'Ajustes sob medida', price: 120, time: '120 min', count: 8 },
  { category: 'especiais', name: 'Costura sob encomenda', price: 200, time: '240 min', count: 5 }
];

const materials = [
  { name: 'Linha de costura poliéster', unit: 'metro', price: 0.5 },
  { name: 'Linha de algodão', unit: 'metro', price: 0.6 },
  { name: 'Linha para jeans', unit: 'metro', price: 0.8 },
  { name: 'Linha para overlock', unit: 'metro', price: 0.7 },
  { name: 'Linha invisível (nylon)', unit: 'metro', price: 1.0 },
  { name: 'Linha encerada', unit: 'metro', price: 0.9 },
  { name: 'Linha para bordado', unit: 'metro', price: 1.2 },
  { name: 'Agulha de máquina doméstica', unit: 'unidade', price: 2.0 },
  { name: 'Agulha de máquina industrial', unit: 'unidade', price: 3.0 },
  { name: 'Agulha para jeans', unit: 'unidade', price: 2.5 },
  { name: 'Agulha para malha', unit: 'unidade', price: 2.5 },
  { name: 'Agulha para tecidos finos', unit: 'unidade', price: 2.0 },
  { name: 'Agulha de mão', unit: 'unidade', price: 1.0 },
  { name: 'Agulha curva', unit: 'unidade', price: 3.5 },
  { name: 'Botão comum', unit: 'unidade', price: 0.5 },
  { name: 'Botão de pressão', unit: 'unidade', price: 1.0 },
  { name: 'Botão de jeans', unit: 'unidade', price: 1.5 },
  { name: 'Botão forrado', unit: 'unidade', price: 2.0 },
  { name: 'Colchete', unit: 'unidade', price: 0.8 },
  { name: 'Gancho', unit: 'unidade', price: 0.8 },
  { name: 'Ilhós', unit: 'unidade', price: 0.6 },
  { name: 'Fecho de metal', unit: 'unidade', price: 1.5 },
  { name: 'Fecho plástico', unit: 'unidade', price: 1.0 },
  { name: 'Zíper comum', unit: 'unidade', price: 5.0 },
  { name: 'Zíper invisível', unit: 'unidade', price: 7.0 },
  { name: 'Zíper de metal', unit: 'unidade', price: 8.0 },
  { name: 'Zíper de nylon', unit: 'unidade', price: 6.0 },
  { name: 'Zíper destacável (jaquetas)', unit: 'unidade', price: 10.0 },
  { name: 'Cursor de zíper (puxador)', unit: 'unidade', price: 2.0 },
  { name: 'Elástico comum', unit: 'metro', price: 1.5 },
  { name: 'Elástico roliço', unit: 'metro', price: 2.0 },
  { name: 'Elástico largo', unit: 'metro', price: 3.0 },
  { name: 'Elástico para cintura', unit: 'metro', price: 2.5 },
  { name: 'Elástico para punho', unit: 'metro', price: 1.8 },
  { name: 'Tecido para remendo', unit: 'metro', price: 10.0 },
  { name: 'Forro', unit: 'metro', price: 8.0 },
  { name: 'Entretela', unit: 'metro', price: 6.0 },
  { name: 'Viés', unit: 'metro', price: 2.0 },
  { name: 'Renda', unit: 'metro', price: 5.0 },
  { name: 'Fita de cetim', unit: 'metro', price: 1.5 },
  { name: 'Fita de gorgurão', unit: 'metro', price: 2.0 },
  { name: 'Passamanaria', unit: 'metro', price: 3.0 },
  { name: 'Tesoura de tecido', unit: 'unidade', price: 25.0 },
  { name: 'Tesoura de arremate', unit: 'unidade', price: 15.0 },
  { name: 'Abridor de casas', unit: 'unidade', price: 8.0 },
  { name: 'Alfinetes', unit: 'pacote', price: 5.0 },
  { name: 'Alfinete de segurança', unit: 'pacote', price: 4.0 },
  { name: 'Dedal', unit: 'unidade', price: 3.0 },
  { name: 'Fita métrica', unit: 'unidade', price: 5.0 },
  { name: 'Giz de alfaiate', unit: 'unidade', price: 3.0 },
  { name: 'Marcador de tecido', unit: 'unidade', price: 6.0 },
  { name: 'Descosedor', unit: 'unidade', price: 4.0 },
  { name: 'Cola para tecido', unit: 'unidade', price: 8.0 },
  { name: 'Spray fixador', unit: 'unidade', price: 12.0 },
  { name: 'Amaciante de costura', unit: 'litro', price: 10.0 },
  { name: 'Ferro de passar', unit: 'unidade', price: 80.0 },
  { name: 'Papel para molde', unit: 'metro', price: 2.0 },
  { name: 'Papel carbono para costura', unit: 'folha', price: 1.5 },
  { name: 'Bainha termocolante', unit: 'metro', price: 3.0 },
  { name: 'Fita termocolante', unit: 'metro', price: 2.5 },
  { name: 'Linha para acabamento fino', unit: 'metro', price: 1.0 },
  { name: 'Entretela termocolante', unit: 'metro', price: 7.0 },
  { name: 'Saco plástico para roupa', unit: 'unidade', price: 0.5 },
  { name: 'Capa protetora', unit: 'unidade', price: 2.0 },
  { name: 'Etiqueta de identificação', unit: 'unidade', price: 0.3 },
  { name: 'Tag de cliente', unit: 'unidade', price: 0.4 }
];

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Conectado ao DB, iniciando seed...');

    let insertedServices = 0;
    for (const s of services) {
      const titulo = s.name;
      const descricao = JSON.stringify({ category: s.category, count: s.count });
      const preco = s.price;
      const duracao = (() => {
        const m = (s.time || '').match(/(\d+)/);
        return m ? parseInt(m[1], 10) : null;
      })();

      const exists = await client.query('SELECT 1 FROM servicos WHERE titulo = $1 LIMIT 1', [titulo]);
      if (exists.rowCount === 0) {
        await client.query(
          'INSERT INTO servicos (titulo, descricao, preco, duracao_minutos) VALUES ($1, $2, $3, $4)',
          [titulo, descricao, preco, duracao]
        );
        insertedServices++;
      }
    }

    let insertedMaterials = 0;
    for (const m of materials) {
      const nome = m.name;
      const unidade = m.unit;
      const preco = m.price;

      const exists = await client.query('SELECT 1 FROM materiais WHERE nome = $1 LIMIT 1', [nome]);
      if (exists.rowCount === 0) {
        await client.query(
          'INSERT INTO materiais (nome, unidade, preco, estoque) VALUES ($1, $2, $3, $4)',
          [nome, unidade, preco, 0]
        );
        insertedMaterials++;
      }
    }

    console.log(`Serviços inseridos: ${insertedServices}`);
    console.log(`Materiais inseridos: ${insertedMaterials}`);

    console.log('Seed finalizada.');
  } catch (e) {
    console.error('Erro during seed:', e.message || e);
  } finally {
    await client.end();
  }
}

run();
