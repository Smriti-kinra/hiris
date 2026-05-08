#!/usr/bin/env node
/**
 * scripts/find-ports.js
 * ─────────────────────────────────────────────────────────────
 * Dynamically allocates ports for all HIRIS services.
 *
 * For each portal defined in portals.config.js:
 *   1. Tries the preferred port
 *   2. If occupied, increments until a free port is found
 *   3. Kills stale HIRIS processes automatically (--kill flag)
 *   4. Writes resolved ports to scripts/.resolved-ports.json
 *   5. Prints the startup table
 *
 * Usage:
 *   node scripts/find-ports.js           # resolve ports, print table
 *   node scripts/find-ports.js --kill    # kill stale processes first
 */

'use strict'
const net  = require('net')
const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PORTALS      = require('./portals.config.js')
const RESOLVED_OUT = path.join(__dirname, '.resolved-ports.json')
const KILL_FLAG    = process.argv.includes('--kill')

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  white:   '\x1b[97m',
  magenta: '\x1b[35m',
  red:     '\x1b[31m',
  blue:    '\x1b[34m',
}
const PORTAL_COLORS = ['blue','cyan','green','yellow','magenta','white','red']

function color(name, str) { return `${C[name] || ''}${str}${C.reset}` }

// ── Check if a TCP port is free ───────────────────────────────────────────────
function isPortFree(port) {
  return new Promise(resolve => {
    const server = net.createServer()
    server.unref()
    server.on('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => { server.close(() => resolve(true)) })
  })
}

// ── Find next free port starting from preferred ───────────────────────────────
async function findFreePort(preferred, maxSearch = 50) {
  for (let p = preferred; p < preferred + maxSearch; p++) {
    if (await isPortFree(p)) return p
  }
  throw new Error(`No free port found in range ${preferred}–${preferred + maxSearch}`)
}

// ── Kill processes on a port (macOS/Linux) ────────────────────────────────────
function killPort(port) {
  try {
    const pids = execSync(`lsof -i :${port} -sTCP:LISTEN -t 2>/dev/null || true`, { encoding: 'utf8' }).trim()
    if (pids) {
      pids.split('\n').filter(Boolean).forEach(pid => {
        try { process.kill(parseInt(pid), 'SIGTERM') } catch (_) {}
      })
      return true
    }
  } catch (_) {}
  return false
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('')
  console.log(color('white', color('bold', '╔══════════════════════════════════════════════════════════╗')))
  console.log(color('white', color('bold', '║          HIRIS — Dynamic Port Allocator                  ║')))
  console.log(color('white', color('bold', '╚══════════════════════════════════════════════════════════╝')))
  console.log('')

  if (KILL_FLAG) {
    console.log(color('yellow', '[CLEANUP] Releasing stale HIRIS ports...'))
    for (const p of PORTALS) {
      const killed = killPort(p.preferred)
      if (killed) console.log(`  ${color('yellow', '⚠')}  Killed process on :${p.preferred} (${p.label})`)
    }
    // Small settle time after killing
    await new Promise(r => setTimeout(r, 600))
    console.log('')
  }

  console.log(color('cyan', '[PORTS]  Allocating ports...'))
  const resolved = {}

  for (let i = 0; i < PORTALS.length; i++) {
    const portal = PORTALS[i]
    const free   = await findFreePort(portal.preferred)
    resolved[portal.id] = free

    const preferred = portal.preferred
    const icon = free === preferred ? color('green', '✓') : color('yellow', '⚡')
    const portStr = free === preferred
      ? color('green', `:${free}`)
      : color('yellow', `:${free}`) + color('yellow', ` (wanted :${preferred})`)
    console.log(`  ${icon}  ${String(portal.label).padEnd(22)} ${portStr}`)
  }

  // Write resolved ports JSON
  fs.writeFileSync(RESOLVED_OUT, JSON.stringify(resolved, null, 2))

  console.log('')
  console.log(color('green', '[OK]     Resolved ports written to scripts/.resolved-ports.json'))
  console.log('')
}

main().catch(err => { console.error(err.message); process.exit(1) })
