const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function testSpeed() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const start = Date.now();
  const res = await c.query('SELECT id, name, sku, type, "costPrice" FROM "Product" WHERE "businessId" = 63 AND "isActive" = true ORDER BY name ASC');
  const elapsed = Date.now() - start;

  console.log(`Fetched ${res.rows.length} products in ${elapsed}ms`);
  console.log('Sample 3 products:', res.rows.slice(0, 3));

  await c.end();
}

testSpeed().catch(console.error);
