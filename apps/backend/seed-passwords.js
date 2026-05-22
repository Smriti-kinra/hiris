#!/usr/bin/env node
/**
 * HIRIS — seed demo passwords
 * Sets bcrypt-hashed password for the three demo portal users.
 * Demo password for all accounts: hiris2026
 *
 * Usage (CLI):  node seed-passwords.js
 * Usage (code): const { seedDemoPasswords } = require('./seed-passwords')
 *               await seedDemoPasswords()
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

const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const DEMO_PASSWORD = 'hiris2026'
const DEMO_EMAILS   = [
  'smriti.kinra@hiris.demo',
  'sartajdeep.singh@hiris.demo',
  'gracy.tanna@hiris.demo',
]

/**
 * Seeds the demo account passwords in the database.
 * Safe to call multiple times — it always sets/refreshes the hash.
 * Only updates users that already exist in the DB (idempotent).
 */
async function seedDemoPasswords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    console.log('[seed-passwords] Hashing demo password…')
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10)
    console.log('[seed-passwords] Hash generated.')

    for (const email of DEMO_EMAILS) {
      const { rowCount } = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)',
        [hash, email]
      )
      if (rowCount === 0) {
        console.warn(`  ⚠ No user found for ${email} — skipping`)
      } else {
        console.log(`  ✓ Password set for ${email}`)
      }
    }

    console.log('[seed-passwords] Done. Demo password: hiris2026')
  } finally {
    await pool.end()
  }
}

// Allow running directly: node seed-passwords.js
if (require.main === module) {
  seedDemoPasswords().catch(err => {
    console.error('[seed-passwords] FAILED:', err.message)
    process.exit(1)
  })
}

module.exports = { seedDemoPasswords }
