const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function checkDevQuotations() {
  const client = new Client({ connectionString: DEV_URL });
  await client.connect();

  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%quotation%';");
  console.log('DEV quotation tables:', tables.rows);

  for (const t of tables.rows) {
    const count = await client.query(`SELECT count(*) FROM "${t.table_name}";`);
    console.log(`Table "${t.table_name}" count:`, count.rows[0].count);
    const rows = await client.query(`SELECT * FROM "${t.table_name}" LIMIT 10;`);
    console.log(`Sample rows from "${t.table_name}":`, rows.rows);
  }

  await client.end();
}

checkDevQuotations();
