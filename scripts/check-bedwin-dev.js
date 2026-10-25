const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function check() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();
  const res = await c.query('SELECT b.id, b.name, b."subscriptionId", s.id as "subId", s.status, s."planType" FROM "Business" b LEFT JOIN "Subscription" s ON b."subscriptionId" = s.id LIMIT 20;');
  console.log('Businesses with sub in DEV:', res.rows);
  await c.end();
}

check();
