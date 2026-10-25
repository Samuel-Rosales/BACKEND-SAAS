const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function run() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const skus = ['EDDC021151', 'EDDC021152', 'EDDC021251', 'EDDC021252'];
  const res = await c.query(`
    SELECT p.id, p.sku, p.name, p."costPrice", p."salePrice",
           COALESCE(SUM(sl.quantity), 0) as stock
    FROM "Product" p
    LEFT JOIN "StockLot" sl ON p.id = sl."productId"
    WHERE p."businessId" = 63 AND p.sku = ANY($1)
    GROUP BY p.id, p.sku, p.name, p."costPrice", p."salePrice";
  `, [skus]);
  console.log(res.rows);

  await c.end();
}

run();
