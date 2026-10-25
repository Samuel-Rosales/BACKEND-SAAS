const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function check(url, label) {
  try {
    const c = new Client({ connectionString: url });
    await c.connect();
    const res = await c.query('SELECT id, name FROM "Business" WHERE name ILIKE \'%EMTOP%\' OR name ILIKE \'%SHOP%\';');
    console.log(`\n=== ${label} Businesses ===`);
    console.log(res.rows);
    for (const b of res.rows) {
      const p = await c.query('SELECT count(*) FROM "Product" WHERE "businessId" = $1', [b.id]);
      const lots = await c.query('SELECT count(*) FROM "StockLot" sl JOIN "Product" p ON sl."productId" = p.id WHERE p."businessId" = $1', [b.id]);
      const movs = await c.query('SELECT count(*) FROM "StockMovement" WHERE "businessId" = $1', [b.id]);
      const sales = await c.query('SELECT count(*) FROM "Sale" WHERE "businessId" = $1', [b.id]);
      const cats = await c.query('SELECT count(*) FROM "Category" WHERE "businessId" = $1', [b.id]);
      console.log(` - [${b.name}] (ID: ${b.id}):`);
      console.log(`   * Productos: ${p.rows[0].count}`);
      console.log(`   * Lotes de Stock: ${lots.rows[0].count}`);
      console.log(`   * Movimientos: ${movs.rows[0].count}`);
      console.log(`   * Ventas: ${sales.rows[0].count}`);
      console.log(`   * Categorías: ${cats.rows[0].count}`);
    }
    await c.end();
  } catch (e) {
    console.error(`${label} error:`, e.message);
  }
}

async function main() {
  await check(DEV_URL, 'DEV');
  await check(PROD_URL, 'PROD');
}

main();
