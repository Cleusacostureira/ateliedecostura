import fs from 'fs';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Please set DATABASE_URL environment variable.');
  process.exit(2);
}

const client = new Client({ connectionString: databaseUrl });

async function run() {
  await client.connect();
  try {
    const ordRes = await client.query('SELECT id, numero, total, valor, value, paymentStatus, created_at FROM ordens');
    const fluxoRes = await client.query('SELECT id, orderid, numero, date, client, service, value, valor, tipo, status FROM fluxo_caixa');

    const ordens = ordRes.rows || [];
    const fluxo = fluxoRes.rows || [];

    const sumOrdens = ordens.reduce((s, o) => s + (Number(o.total || o.valor || o.value || 0) || 0), 0);
    const sumFluxoReceitas = fluxo.reduce((s, f) => {
      const v = Number(f.value || f.valor || 0) || 0;
      const tipo = (f.tipo || '').toString().toLowerCase();
      if (tipo === 'despesa' || v < 0) return s; // not receita
      return s + v;
    }, 0);
    const sumFluxoDespesas = fluxo.reduce((s, f) => {
      const v = Number(f.value || f.valor || 0) || 0;
      const tipo = (f.tipo || '').toString().toLowerCase();
      if (tipo === 'despesa' || v < 0) return s + Math.abs(v);
      return s;
    }, 0);

    // find orders without fluxo entry
    const fluxoOrderIds = new Set(fluxo.map(f => f.orderid ? String(f.orderid) : null).filter(Boolean));
    const ordensMissingFluxo = ordens.filter(o => { const id = o.id ? String(o.id) : null; return id && !fluxoOrderIds.has(id); });

    // find fluxo entries that reference no order
    const ordemIdsSet = new Set(ordens.map(o => o.id ? String(o.id) : null).filter(Boolean));
    const fluxoOrphan = fluxo.filter(f => { const oid = f.orderid ? String(f.orderid) : null; return oid && !ordemIdsSet.has(oid); });

    const output = {
      counts: { ordens: ordens.length, fluxo: fluxo.length },
      totals: { sumOrdens, sumFluxoReceitas, sumFluxoDespesas },
      ordensMissingFluxo: ordensMissingFluxo.map(o => ({ id: o.id, numero: o.numero, total: o.total || o.valor || o.value })),
      fluxoOrphan: fluxoOrphan.map(f => ({ id: f.id, orderid: f.orderid, numero: f.numero, value: f.value || f.valor, tipo: f.tipo, client: f.client }))
    };

    const outPath = './scripts/compare_finance_output.json';
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
    console.log('Wrote', outPath);
    console.log('Summary:');
    console.log('  ordens rows:', output.counts.ordens);
    console.log('  fluxo_caixa rows:', output.counts.fluxo);
    console.log('  sum ordens total:', output.totals.sumOrdens.toFixed(2));
    console.log('  fluxo receitas (positive):', output.totals.sumFluxoReceitas.toFixed(2));
    console.log('  fluxo despesas:', output.totals.sumFluxoDespesas.toFixed(2));
    console.log('  ordens missing fluxo count:', output.ordensMissingFluxo.length);
    console.log('  fluxo orphan count:', output.fluxoOrphan.length);
    console.log('See', outPath, 'for full details.');
  } finally {
    await client.end();
  }
}

run().catch(err => { console.error(err); process.exit(2); });
