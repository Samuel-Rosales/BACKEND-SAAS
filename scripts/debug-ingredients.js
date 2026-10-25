const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const found = await c.query('SELECT id, name, type, "businessId" FROM "Product" WHERE name ILIKE ANY(ARRAY[\'%MINI UPS%\', \'%caucho 32%\', \'%audifono%\', \'%camara%\', \'%ROUTER MERCUSY%\'])');
  console.log('Matching products in PROD:', found.rows);

  if (found.rows.length > 0) {
    const bizId = found.rows[0].businessId;
    console.log('Business ID is:', bizId);
    
    // Check all products for that business
    const allProdCount = await c.query('SELECT count(*) FROM "Product" WHERE "businessId" = $1 AND "isActive" = true', [bizId]);
    console.log('Total active products in biz:', allProdCount.rows[0].count);

    const byType = await c.query('SELECT type, count(*) FROM "Product" WHERE "businessId" = $1 AND "isActive" = true GROUP BY type', [bizId]);
    console.log('By type:', byType.rows);

    // Check first 20 products ordered by id desc (which is what findAll does)
    const first20 = await c.query('SELECT id, name, type FROM "Product" WHERE "businessId" = $1 AND "isActive" = true ORDER BY id DESC LIMIT 20', [bizId]);
    console.log('\n--- First 20 products returned by findAll(businessId) (default limit 20) ---');
    first20.rows.forEach(r => console.log(`[${r.id}] ${r.name} - Type: ${r.type}`));

    const simpleInFirst20 = first20.rows.filter(r => r.type === 'SIMPLE');
    console.log(`\nOf these first 20, how many are SIMPLE: ${simpleInFirst20.length}`);
    simpleInFirst20.forEach(r => console.log(` -> ${r.name}`));
  }

  await c.end();
}

main().catch(console.error);
