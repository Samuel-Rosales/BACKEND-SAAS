const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function findProds() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();
  const res = await c.query(`SELECT id, name, sku, "businessId" FROM "Product" WHERE name ILIKE '%audifono%' OR name ILIKE '%camar%' OR sku IN ('6932391933831', '6939554982361');`);
  console.log('Matching prods in PROD:', res.rows);
  await c.end();
}

findProds();
