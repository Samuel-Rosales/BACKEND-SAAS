const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function check() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();
  const skus = ['ULMDL0811', 'ULMDL0906', 'EACD11011525', 'ENGV0102', 'ULCKL2059', 'UELBNLI3508', 'ELGS208501', 'EHTSV01H09'];
  const res = await c.query('SELECT p.id, p."businessId", b.name as bname, p.sku, p.name, p."costPrice" FROM "Product" p JOIN "Business" b ON p."businessId" = b.id WHERE UPPER(p.sku) = ANY($1)', [skus]);
  console.log('Results across ALL businesses for missing SKUs:', res.rows);

  // Check if they exist by partial name or without prefix
  for (const sku of skus) {
    const partial = await c.query('SELECT p.id, p."businessId", p.sku, p.name FROM "Product" p WHERE p.sku ILIKE $1 OR p.name ILIKE $2', [`%${sku}%`, `%${sku}%`]);
    if (partial.rows.length > 0) {
      console.log(`Partial matches for ${sku}:`, partial.rows);
    }
  }

  // Also check surplus products in DB
  const surplusIds = [5726, 5781, 5783, 5785, 7236];
  const surplusRes = await c.query('SELECT p.id, p.sku, p.name, p."costPrice", p."salePrice", p."updatedAt" FROM "Product" p WHERE p.id = ANY($1)', [surplusIds]);
  console.log('Surplus products in DB:', surplusRes.rows);

  await c.end();
}

check();
