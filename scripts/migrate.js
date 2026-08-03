// Applies lib/db/migrations/*.sql files that haven't run yet, tracked in a
// schema_migrations table. Safe to re-run: already-applied files are skipped.
//
// Usage: node --env-file=.env.local scripts/migrate.js
// Required env vars match lib/db/client.ts: DATABASE_HOST, DATABASE_PORT,
// DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, DATABASE_SSL

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'lib', 'db', 'migrations');

function sortMigrationFiles(filenames) {
  return filenames.filter((f) => f.endsWith('.sql')).sort();
}

function getPendingMigrations(sortedFilenames, appliedFilenames) {
  const applied = new Set(appliedFilenames);
  return sortedFilenames.filter((f) => !applied.has(f));
}

async function runMigrations(pool, migrationsDir = MIGRATIONS_DIR) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const allFiles = sortMigrationFiles(fs.readdirSync(migrationsDir));
    const appliedResult = await client.query('SELECT filename FROM schema_migrations');
    const pending = getPendingMigrations(
      allFiles,
      appliedResult.rows.map((r) => r.filename)
    );

    const applied = [];
    for (const filename of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        applied.push(filename);
        console.log(`✓ applied ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${err.message}`);
      }
    }

    return { applied, skipped: allFiles.length - pending.length };
  } finally {
    client.release();
  }
}

async function main() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'gettogether',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const { applied, skipped } = await runMigrations(pool);
    console.log(`\nDone. Applied ${applied.length} migration(s), skipped ${skipped} already-applied.`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { sortMigrationFiles, getPendingMigrations, runMigrations };
