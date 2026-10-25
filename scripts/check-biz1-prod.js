const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkBiz1() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const prods = await c.query('SELECT id, name, sku, "salePrice", "businessId" FROM "Product" WHERE "businessId" = 1 LIMIT 10;');
  console.log('Tienda Central Products in PROD:', prods.rows);

  const clients = await c.query('SELECT id, name, ci, "businessId" FROM "Client" WHERE "businessId" = 1 LIMIT 10;');
  console.log('Tienda Central Clients in PROD:', clients.rows);

  const rates = await c.query('SELECT * FROM "ExchangeRate" WHERE "businessId" = 1 ORDER BY id DESC LIMIT 3;');
  console.log('Tienda Central Rates in PROD:', rates.rows);

  await c.end();
}

checkBiz1();
