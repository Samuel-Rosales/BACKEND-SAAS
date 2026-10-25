const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway' });

async function checkBiz63() {
  const b = await pool.query(`SELECT * FROM "Business" WHERE id = 63`);
  console.log('Business 63 in PROD:', b.rows[0]);
  
  const depots = await pool.query(`SELECT * FROM "Depot" WHERE "businessId" = 63`);
  console.log('Depots in 63:', depots.rows);

  const exchangeRates = await pool.query(`SELECT * FROM "ExchangeRate" WHERE "businessId" = 63`);
  console.log('Rates in 63:', exchangeRates.rows);

  pool.end();
}

checkBiz63().catch(e => { console.error(e); pool.end(); });
