#!/usr/bin/env node
/**
 * HIRIS — seed demo passwords
 * Sets bcrypt-hashed password for the three demo portal users.
 * Demo password for all accounts: hiris2026
 *
 * Usage: node seed-passwords.js
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

async function seedPasswords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  console.log('\n[seed-passwords] Hashing demo password…')
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10)
  console.log('[seed-passwords] Hash generated.')

  for (const email of DEMO_EMAILS) {
    const { rowCount } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, email]
    )
    if (rowCount === 0) {
      console.warn(`  ⚠ No user found for ${email}`)
    } else {
      console.log(`  ✓ Password set for ${email}`)
    }
  }

  await pool.end()
  console.log('\n[seed-passwords] Done. Demo password: hiris2026\n')
}

seedPasswords().catch(err => {
  console.error('[seed-passwords] FAILED:', err.message)
  process.exit(1)
})
