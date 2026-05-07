require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./config/db');

async function go() {
  const hash = await bcrypt.hash('password123', 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = 2', [hash]);
  console.log('Password updated to password123');
  process.exit(0);
}
go().catch(console.error);
