const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function checkCols() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();
  const u = await c.query('SELECT * FROM "User" LIMIT 1;');
  console.log('User sample keys:', Object.keys(u.rows[0]));
  console.log('User sample:', u.rows[0]);
  await c.end();
}

checkCols();
