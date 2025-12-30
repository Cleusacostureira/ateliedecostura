# Database migrations

This folder contains SQL migrations for the Cleusa system. The included migration targets PostgreSQL (compatible with Supabase).

Files:
- `migrations/0001_init.sql` — initial schema (users, clientes, ordens, servicos, pagamentos, disparos, configuracoes, relatorios).

How to apply (Supabase dashboard):
1. Open the SQL editor in the Supabase dashboard and paste the contents of `migrations/0001_init.sql`, then run.

How to apply (psql):
```bash
# Example using a Supabase connection string (replace with your credentials)
psql "postgresql://<db_user>:<db_pass>@<db_host>:<db_port>/<db_name>" -f db/migrations/0001_init.sql
```markdown
# Database migrations

This folder contains SQL migrations for the Cleusa system. The included migration targets PostgreSQL (compatible with Supabase).

Files:
- `migrations/0001_init.sql` — initial schema (users, clientes, ordens, servicos, pagamentos, disparos, configuracoes, relatorios).

How to apply (Supabase dashboard):
1. Open the SQL editor in the Supabase dashboard and paste the contents of `migrations/0001_init.sql`, then run.

How to apply (psql):
```bash
# Example using a Supabase connection string (replace with your credentials)
psql "postgresql://<db_user>:<db_pass>@<db_host>:<db_port>/<db_name>" -f db/migrations/0001_init.sql
```

How to apply (Supabase CLI):
1. Install the Supabase CLI and login.
2. Use the SQL editor shown above or use `supabase db remote commit` / migration workflows described in Supabase docs.

Notes:
- This migration is intentionally minimal and intended as a starting point. Review column names and types to match your production needs (e.g., encryption, constraints, enum values).
- The migration creates `pgcrypto` extension (for `gen_random_uuid()`). Ensure your Supabase project allows extensions (it does by default).

How to apply (automatically via Node locally):

1. Install dependencies:
```bash
npm install pg
```
2. Set `DATABASE_URL` to your Supabase connection string (found in Project Settings -> Database -> Connection string).
3. Run the migration script:
```bash
npm run db:migrate
```

````
