const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function listDevBiz() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();
  const res = await c.query(`
    SELECT b.id, b.name, count(p.id) as prods 
    FROM "Business" b 
    LEFT JOIN "Product" p ON b.id = p."businessId" 
    GROUP BY b.id, b.name 
    HAVING count(p.id) > 0 
    ORDER BY prods DESC;
  `);
  console.log('DEV Businesses with products:');
  res.rows.forEach(r => console.log(`[${r.id}] ${r.name}: ${r.prods} productos`));
  await c.end();
}

listDevBiz().catch(console.error);
