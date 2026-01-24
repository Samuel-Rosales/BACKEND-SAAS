require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = async (sql) => (await pool.query(sql)).rows[0].c;
  try {
    console.log('Tax', await q('SELECT COUNT(*)::int AS c FROM "Tax"'));
    console.log('Product', await q('SELECT COUNT(*)::int AS c FROM "Product"'));
    console.log('ProductComponent', await q('SELECT COUNT(*)::int AS c FROM "ProductComponent"'));
    console.log('Sale', await q('SELECT COUNT(*)::int AS c FROM "Sale"'));
    console.log('SaleInstallment', await q('SELECT COUNT(*)::int AS c FROM "SaleInstallment"'));
    console.log('Purchase', await q('SELECT COUNT(*)::int AS c FROM "Purchase"'));
    console.log('PurchaseInstallment', await q('SELECT COUNT(*)::int AS c FROM "PurchaseInstallment"'));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
