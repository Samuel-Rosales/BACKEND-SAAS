const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkProdBiz() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const bizs = await c.query(`
    SELECT b.id, b.name, b."createdAt",
           (SELECT count(*) FROM "Client" c WHERE c."businessId" = b.id) as clients,
           (SELECT count(*) FROM "Product" p WHERE p."businessId" = b.id) as products
    FROM "Business" b
    ORDER BY b.id DESC LIMIT 10;
  `);
  console.log('Latest PROD Businesses:', bizs.rows);

  await c.end();
}

checkProdBiz();
