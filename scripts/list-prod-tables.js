const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function listAllTables() {
  const client = new Client({ connectionString: PROD_URL });
  try {
    await client.connect();
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`);
    console.log('All PROD tables:', res.rows.map(r => r.table_name));

    // Also check if any table has quotation in column name
    const cols = await client.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ILIKE '%quot%' OR column_name ILIKE '%presup%');`);
    console.log('Columns matching quot/presup:', cols.rows);

  } finally {
    await client.end();
  }
}

listAllTables();
