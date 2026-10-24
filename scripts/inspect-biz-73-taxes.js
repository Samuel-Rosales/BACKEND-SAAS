const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function inspect(label, url) {
  console.log(`\n================== ${label} ==================`);
  const client = new Client({ connectionString: url });
  try {
    await client.connect();

    // Check Business 73
    const bizRes = await client.query('SELECT * FROM "Business" WHERE id = 73;');
    console.log(`[${label}] Business 73:`, bizRes.rows);

    // List all Taxes
    const taxesRes = await client.query('SELECT id, name, rate, "isActive" FROM "Tax" ORDER BY id;');
    console.log(`[${label}] Taxes in DB:`, taxesRes.rows);

    if (bizRes.rows.length > 0) {
      // Products of Business 73
      const prodStats = await client.query(`
        SELECT p."taxId", t.name as "taxName", t.rate as "taxRate", count(*) as total
        FROM "Product" p
        LEFT JOIN "Tax" t ON p."taxId" = t.id
        WHERE p."businessId" = 73
        GROUP BY p."taxId", t.name, t.rate;
      `);
      console.log(`[${label}] Product Taxes for Business 73:`, prodStats.rows);

      const totalProds = await client.query('SELECT count(*) FROM "Product" WHERE "businessId" = 73;');
      console.log(`[${label}] Total products for Business 73:`, totalProds.rows[0].count);

      // Check 3 sample products
      const sampleProds = await client.query('SELECT id, name, sku, "costPrice", "salePrice", "taxId" FROM "Product" WHERE "businessId" = 73 LIMIT 3;');
      console.log(`[${label}] Sample products:`, sampleProds.rows);

      const sales = await client.query('SELECT count(*) FROM "Sale" WHERE "businessId" = 73;');
      console.log(`[${label}] Total Sales:`, sales.rows[0].count);

      const purchases = await client.query('SELECT count(*) FROM "Purchase" WHERE "businessId" = 73;');
      console.log(`[${label}] Total Purchases:`, purchases.rows[0].count);

      const pres = await client.query('SELECT count(*) FROM "ProductPresentation" pp JOIN "Product" p ON pp."productId" = p.id WHERE p."businessId" = 73;');
      console.log(`[${label}] Total ProductPresentation:`, pres.rows[0].count);
    }
  } catch (err) {
    console.error(`[${label}] Error:`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await inspect('PROD', PROD_URL);
  await inspect('DEV', DEV_URL);
}

main();
