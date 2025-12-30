# Ateliê de Costura — Local Development

Este repositório contém o frontend (Vite + React) e um pequeno servidor de upload para testes com Supabase.

Principais comandos

- Rodar app em desenvolvimento:

```powershell
npm install
npm run dev
```

- Rodar o servidor de upload (usa a Service Role key — NÃO compartilhe):

```powershell
npm install express multer @supabase/supabase-js
$env:SUPABASE_URL = 'https://<your-project>.supabase.co'
$env:SUPABASE_SERVICE_ROLE = '<SERVICE_ROLE_KEY>'
npm run start:upload
```

Teste de upload (curl):

```bash
curl -F "file=@/caminho/para/cleusa.png" http://localhost:3000/upload-logo
```

Notas importantes

- O servidor `server/upload.js` existe para casos onde o cliente não pode escrever diretamente no Storage devido a RLS/permissions. Ele usa a Service Role key e realiza upload + upsert em `configuracoes`.
- Para permitir uploads diretos do cliente sem um servidor, aplique políticas RLS apropriadas como owner do banco (ou use as migrations fornecidas).
- Criar bucket `logos` no Supabase Dashboard → Storage se ainda não existir.

Scripts úteis

- `npm run db:migrate` — aplica a migração inicial `0001_init.sql` usando `DATABASE_URL`.
- `npm run db:migrate:all` — aplica todas as migrações em `db/migrations`.
- `npm run start:upload` — executa `server/upload.js` (precisa das env vars acima).

Segurança

- Nunca exponha a Service Role key no frontend. Use o servidor para operações sensíveis.

