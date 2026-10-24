const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function inspect(label, url) {
  console.log(`\n================== INSPECTING ${label} ==================`);
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    
    // Check tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`[${label}] Total tables:`, tables.length);
    console.log(`[${label}] Quotation table exists?`, tables.includes('Quotation'));
    console.log(`[${label}] Budget table exists?`, tables.includes('Budget'));

    if (tables.includes('Quotation')) {
      const countRes = await client.query('SELECT count(*) FROM "Quotation";');
      console.log(`[${label}] "Quotation" rows:`, countRes.rows[0].count);
      const rows = await client.query('SELECT id, "businessId", "receiptNumber", "totalAmount", status, "createdAt" FROM "Quotation" ORDER BY id DESC LIMIT 10;');
      console.log(`[${label}] Recent Quotations:`, rows.rows);
    }

    if (tables.includes('QuotationItem')) {
      const countRes = await client.query('SELECT count(*) FROM "QuotationItem";');
      console.log(`[${label}] "QuotationItem" rows:`, countRes.rows[0].count);
    }

    if (tables.includes('Budget')) {
      const countRes = await client.query('SELECT count(*) FROM "Budget";');
      console.log(`[${label}] "Budget" rows:`, countRes.rows[0].count);
      const rows = await client.query('SELECT * FROM "Budget" LIMIT 5;');
      console.log(`[${label}] Recent Budgets:`, rows.rows);
    }

    if (tables.includes('Client')) {
      const countRes = await client.query('SELECT count(*) FROM "Client";');
      console.log(`[${label}] "Client" rows:`, countRes.rows[0].count);
    }

    if (tables.includes('Business')) {
      const bRes = await client.query('SELECT id, name FROM "Business";');
      console.log(`[${label}] Businesses:`, bRes.rows);
    }

  } catch (err) {
    console.error(`[${label}] Error:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await inspect('DEV', DEV_URL);
  await inspect('PROD', PROD_URL);
}

run();
