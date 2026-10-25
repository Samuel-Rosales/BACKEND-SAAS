const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function check() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();
  const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Business';");
  console.log('Columns:', cols.rows.map(r => r.column_name));
  const b = await c.query('SELECT * FROM "Business" WHERE id = 63;');
  console.log('BUSINESS 63:', JSON.stringify(b.rows[0], null, 2));
  await c.end();
}
check();
