const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function check() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();
  const sale = await c.query('SELECT * FROM "Sale" WHERE id = 2290;');
  console.log('SALE 2290:', JSON.stringify(sale.rows[0], null, 2));
  const items = await c.query('SELECT * FROM "SaleItem" WHERE "saleId" = 2290;');
  console.log('SALE ITEMS 2290:', JSON.stringify(items.rows, null, 2));
  await c.end();
}
check();
