const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function run() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();
  const res = await c.query(`
    SELECT "businessId", count(*) as count 
    FROM "Sale" 
    GROUP BY "businessId" 
    ORDER BY count DESC;
  `);
  console.log('DEV Sales count per business:');
  console.log(res.rows);
  await c.end();
}

run().catch(console.error);
