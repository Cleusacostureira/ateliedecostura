/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, process, console, fetch */
// Simple test script to create an order and a fluxo_caixa entry via Supabase REST API.
// Usage: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment or in .env.local at repo root.

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    const lines = txt.split(/\r?\n/);
    const env = {};
    for (const l of lines) {
      const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        let val = m[2];
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        env[m[1]] = val;
      }
    }
    return env;
  } catch { return {}; }
}

(async function() {
  const cwd = process.cwd();
  const dotenv = loadEnvFile(path.join(cwd, '.env.local'));
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || dotenv.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || dotenv.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment or .env.local');
    process.exit(2);
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    // create order
    const orderPayload = {
      cliente_id: null,
      status: 'Recebido',
      total: 35.00,
      data_entrega: new Date(Date.now() + 7*24*3600*1000).toISOString(),
      notas: JSON.stringify({ obs: 'Teste via script', pieces: [{ tipo: 'Camiseta', cor: 'Preto', modelo: 'P', services: [{ name: 'Bainha', price: 35 }] }], services: [{ name: 'Bainha', price: 35 }] })
    };

    console.log('Creating ordens with payload:', JSON.stringify(orderPayload, null, 2));
    const ordRes = await fetch(`${SUPABASE_URL}/rest/v1/ordens`, { method: 'POST', headers, body: JSON.stringify(orderPayload) });
    const ordText = await ordRes.text();
    let ordJson = null;
    try { ordJson = JSON.parse(ordText); } catch { ordJson = ordText; }
    console.log('ordens response status:', ordRes.status);
    console.log('ordens response body:', ordJson);

    if (ordRes.status >= 400) {
      console.error('Failed to create ordens. Aborting.');
      process.exit(3);
    }

    const created = Array.isArray(ordJson) && ordJson[0] ? ordJson[0] : null;
    const createdId = created ? created.id : null;
    const createdNumero = created ? created.numero : null;

    // create fluxo_caixa
    const fluxoPayload = {
      date: new Date().toISOString().slice(0,10),
      client: 'Teste Cliente',
      service: 'Bainha',
      value: 35.00,
      status: 'Pago',
      orderid: createdId,
      numero: createdNumero || null,
      pecas: [{ tipo: 'Camiseta', cor: 'Preto', modelo: 'P' }]
    };

    console.log('Creating fluxo_caixa with payload:', JSON.stringify(fluxoPayload, null, 2));
    const fluxoRes = await fetch(`${SUPABASE_URL}/rest/v1/fluxo_caixa`, { method: 'POST', headers, body: JSON.stringify(fluxoPayload) });
    const fluxoText = await fluxoRes.text();
    let fluxoJson = null;
    try { fluxoJson = JSON.parse(fluxoText); } catch { fluxoJson = fluxoText; }
    console.log('fluxo_caixa response status:', fluxoRes.status);
    console.log('fluxo_caixa response body:', fluxoJson);

    if (fluxoRes.status >= 400) {
      console.error('Failed to create fluxo_caixa.');
      process.exit(4);
    }

    console.log('Test completed. Created ordens id:', createdId, 'numero:', createdNumero);
  } catch (e) {
    console.error('Unexpected error', e);
    process.exit(10);
  }
})();
