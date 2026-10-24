const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function check() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const res = await c.query(`
    SELECT UPPER(sku) as usku, COUNT(*) 
    FROM "Product" 
    WHERE "businessId" = 63 
    GROUP BY UPPER(sku) 
    HAVING COUNT(*) > 1;
  `);
  console.log('Duplicate SKUs in DB for Business 63:', res.rows);

  const dupDetails = await c.query(`
    SELECT id, sku, name, "costPrice", "salePrice", "updatedAt"
    FROM "Product"
    WHERE "businessId" = 63 AND UPPER(sku) IN ('ULAGR17181', 'ULWPPV03701', 'ULWSBD110016344')
    ORDER BY sku, id;
  `);
  console.log('Duplicate SKU Details:', dupDetails.rows);

  await c.end();
}

check();
