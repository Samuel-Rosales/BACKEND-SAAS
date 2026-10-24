const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function checkMember189() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();
  const m = await c.query('SELECT bm.*, u.name as "userName", u.ci FROM "BusinessMember" bm JOIN "User" u ON bm."userId" = u.id WHERE bm.id = 189;');
  console.log('Member 189 in DEV:', m.rows[0]);
  const b = await c.query('SELECT * FROM "Business" WHERE id = 46;');
  console.log('Business 46 in DEV:', b.rows[0]);
  await c.end();
}

checkMember189();
