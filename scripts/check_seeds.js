/* eslint-env node */
/* global process, console */
// scripts/check_seeds.js (ESM)
// Uso: instalar dependências e rodar: node scripts/check_seeds.js

import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão configuradas em .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  try {
    const svcRes = await supabase.from('servicos').select('id').limit(1);
    if (svcRes.error) {
      console.error('Erro ao consultar servicos:', svcRes.error.message || svcRes.error);
    } else {
      const countRes = await supabase.from('servicos').select('id', { count: 'exact', head: false });
      const total = Array.isArray(countRes.data) ? countRes.data.length : 'unknown';
      console.log('servicos:', total, '(consulta direta)');
    }

    const matRes = await supabase.from('materiais').select('id').limit(1);
    if (matRes.error) {
      console.error('Erro ao consultar materiais:', matRes.error.message || matRes.error);
    } else {
      const countRes2 = await supabase.from('materiais').select('id', { count: 'exact', head: false });
      const total2 = Array.isArray(countRes2.data) ? countRes2.data.length : 'unknown';
      console.log('materiais:', total2, '(consulta direta)');
    }

    // opcional: listar primeiras linhas
    const firstSvc = await supabase.from('servicos').select('*').limit(5);
    if (!firstSvc.error) console.log('Primeiros 5 servicos:', firstSvc.data);
    const firstMat = await supabase.from('materiais').select('*').limit(5);
    if (!firstMat.error) console.log('Primeiros 5 materiais:', firstMat.data);

  } catch (e) {
    console.error('Erro inesperado:', e.message || e);
  }
}

check();
