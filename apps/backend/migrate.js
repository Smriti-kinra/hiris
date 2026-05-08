#!/usr/bin/env node
/**
 * HIRIS — database migration runner
 * Usage: node migrate.js
 * Runs every *.sql file in ./migrations/ in filename order,
 * skipping any that have already been applied.
 */
const fs   = require('fs')
const path = require('path')
const { config: loadEnv } = require('dotenv')

const envCandidates = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '..', 'backend', '.env'),
  path.join(process.cwd(), '.env'),
]
const envPath = envCandidates.find(p => fs.existsSync(p))
loadEnv({ path: envPath })

const { Pool } = require('pg')

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  console.log('\n[migrate] Connected to', process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@'))

  // Tracking table — stores which migrations have been applied
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      filename    TEXT UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  const dir   = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

  if (files.length === 0) {
    console.log('[migrate] No migration files found.')
    await pool.end(); return
  }

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM _migrations WHERE filename = $1', [file]
    )
    if (rows.length > 0) {
      console.log(`  ✓ ${file} (already applied — skipped)`)
      continue
    }
    console.log(`  → Applying ${file}…`)
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
    console.log(`  ✓ ${file} done`)
  }

  await pool.end()
  console.log('\n[migrate] All migrations complete.\n')
}

migrate().catch(err => {
  console.error('[migrate] FAILED:', err.message)
  process.exit(1)
})
