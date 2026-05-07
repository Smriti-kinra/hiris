require('dotenv').config();
const { query } = require('./config/db');
query(`SELECT r.name, r.visible_stages FROM roles r JOIN users u ON u.role_id = r.id WHERE u.email IN ('smriti.kinra@hiris.demo', 'gracy.tanna@hiris.demo')`)
  .then(r => console.log(JSON.stringify(r.rows, null, 2)))
  .catch(console.error)
  .finally(() => process.exit(0));
