const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function check() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();
  const b = await c.query('SELECT b.id, b.name, s.id as sub_id FROM "Business" b LEFT JOIN "Subscription" s ON s."businessId" = b.id;');
  console.log('DEV businesses and their subscriptions:', b.rows);
  await c.end();
}

check();
