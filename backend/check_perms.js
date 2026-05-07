require('dotenv').config()
const { query } = require('./config/db')

async function main() {
  // Check request 7
  const r = await query('SELECT id, org_id, status, requested_by FROM headcount_requests WHERE id=7')
  console.log('Request 7:', r.rows[0])
  
  // Check HM user 2 - their org_id and permissions via role join
  const u = await query(`
    SELECT u.id, u.name, u.org_id, u.role_id,
      r.name AS role_name, r.permissions
    FROM users u
    LEFT JOIN roles r ON r.id=u.role_id AND r.org_id=u.org_id
    WHERE u.id=2
  `)
  console.log('HM User:', u.rows[0]?.name, 'org_id:', u.rows[0]?.org_id, 'role:', u.rows[0]?.role_name)
  console.log('Permissions:', JSON.stringify(u.rows[0]?.permissions))
  
  process.exit(0)
}
main().catch(e => { console.error(e.message); process.exit(1) })
