const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkSales() {
  const cDev = new Client({ connectionString: DEV_URL });
  await cDev.connect();
  const devSales = await cDev.query("SELECT id, \"businessId\", \"receiptNumber\", \"totalAmount\", \"createdAt\" FROM \"Sale\" WHERE \"createdAt\" > '2026-09-20' ORDER BY id DESC LIMIT 10;");
  console.log('DEV recent sales:', devSales.rows);
  await cDev.end();

  const cProd = new Client({ connectionString: PROD_URL });
  await cProd.connect();
  const prodSales = await cProd.query("SELECT id, \"businessId\", \"receiptNumber\", \"totalAmount\", \"createdAt\" FROM \"Sale\" WHERE \"createdAt\" > '2026-09-20' ORDER BY id DESC LIMIT 10;");
  console.log('PROD recent sales:', prodSales.rows);
  await cProd.end();
}

checkSales();
