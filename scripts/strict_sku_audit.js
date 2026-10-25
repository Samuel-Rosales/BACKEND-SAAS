const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkStrictSkuMatching() {
  const excelItems = JSON.parse(fs.readFileSync(path.join(__dirname, 'excel_audit_items.json'), 'utf-8'));
  const client = new Client({ connectionString: PROD_URL });
  await client.connect();

  const prodsRes = await client.query(`
    SELECT p.id, p.sku, p.name, p."costPrice", p."salePrice",
           COALESCE(SUM(sl.quantity), 0) as stock
    FROM "Product" p
    LEFT JOIN "StockLot" sl ON p.id = sl."productId"
    WHERE p."businessId" = 63
    GROUP BY p.id, p.sku, p.name, p."costPrice", p."salePrice";
  `);
  await client.end();

  const dbProducts = prodsRes.rows;
  const dbSkus = new Map();
  for (const p of dbProducts) {
    if (p.sku) {
      dbSkus.set(p.sku.trim().toUpperCase(), p);
    }
  }

  const excelSkusInDb = [];
  const excelSkusNotInDb = [];

  for (const item of excelItems) {
    const sku = item.sku.trim().toUpperCase();
    if (dbSkus.has(sku)) {
      excelSkusInDb.push({ item, db: dbSkus.get(sku) });
    } else {
      excelSkusNotInDb.push(item);
    }
  }

  console.log(`Excel total items: ${excelItems.length}`);
  console.log(`Excel items whose SKU exists in DB: ${excelSkusInDb.length}`);
  console.log(`Excel items whose SKU does NOT exist in DB: ${excelSkusNotInDb.length}`);

  console.log('\n--- Excel items whose SKU does NOT exist in DB ---');
  for (const missing of excelSkusNotInDb) {
    console.log(`Row ${missing.row}: SKU='${missing.sku}' | Name='${missing.name}' | Stock=${missing.stock} | Cost=${missing.costPrice}`);
  }

  // Also check DB SKUs that are not in Excel
  const excelSkuSet = new Set(excelItems.map(i => i.sku.trim().toUpperCase()));
  const dbSkusNotInExcel = dbProducts.filter(p => !excelSkuSet.has(p.sku.trim().toUpperCase()));
  console.log(`\nDB products whose SKU is NOT in Excel: ${dbSkusNotInExcel.length}`);
  for (const surplus of dbSkusNotInExcel) {
    console.log(`ID ${surplus.id}: SKU='${surplus.sku}' | Name='${surplus.name}' | Stock=${surplus.stock} | Cost=${surplus.costPrice}`);
  }
}

checkStrictSkuMatching().catch(console.error);
