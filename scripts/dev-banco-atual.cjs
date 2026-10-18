// Inicia o Vite usando sempre o banco que está no .env.production,
// ignorando variáveis antigas do Windows (VITE_SUPABASE_URL de projetos que não existem mais).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const raiz = path.resolve(__dirname, '..');
const env = { ...process.env };
for (const linha of fs.readFileSync(path.join(raiz, '.env.production'), 'utf8').split(/\r?\n/)) {
  const m = linha.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*"?([^"]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const vite = path.join(raiz, 'node_modules', 'vite', 'bin', 'vite.js');
spawn(process.execPath, [vite, raiz, ...process.argv.slice(2)], { stdio: 'inherit', env, cwd: raiz }).on('exit', c => process.exit(c ?? 0));
