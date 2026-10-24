const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function checkAllQuotes() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();
  const q = await c.query('SELECT * FROM "Quotation";');
  console.log('All DEV Quotations:', q.rows);
  const qi = await c.query('SELECT * FROM "QuotationItem";');
  console.log('All DEV QuotationItems:', qi.rows);
  await c.end();
}

checkAllQuotes();
