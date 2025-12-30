#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function run() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: set DATABASE_URL environment variable to your Postgres connection string.');
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found in', MIGRATIONS_DIR);
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    for (const file of files) {
      const full = path.join(MIGRATIONS_DIR, file);
      console.log('Applying', file);
      const sql = fs.readFileSync(full, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Applied', file);
      } catch (err) {
        console.error('Failed applying', file, err.message || err);
        try { await client.query('ROLLBACK'); } catch (_) {}
        throw err;
      }
    }
    console.log('All migrations applied.');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Migration runner failed:', err.message || err);
  process.exit(1);
});
