#!/usr/bin/env node
import fs from 'fs';
import { Client } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const MIGRATION_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations', '0001_init.sql');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: set DATABASE_URL environment variable to your Postgres connection string.');
    console.error('Example (Supabase): postgres://user:pass@db.host:5432/dbname');
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database — applying migration...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    try { await client.query('ROLLBACK'); } catch (_) {}
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
