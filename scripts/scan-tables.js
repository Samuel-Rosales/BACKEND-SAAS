const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function scanTables(label, url) {
  const c = new Client({ connectionString: url });
  await c.connect();
  console.log(`\n=== Scanning all tables in ${label} ===`);

  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  for (const t of tables.rows) {
    const tableName = t.table_name;
    try {
      const res = await c.query(`SELECT count(*) FROM "${tableName}";`);
      const count = parseInt(res.rows[0].count, 10);
      if (count > 0 && (tableName.toLowerCase().includes('quot') || tableName.toLowerCase().includes('budg') || tableName.toLowerCase().includes('presup'))) {
        console.log(`[${label}] Table "${tableName}": ${count} rows`);
        const sample = await c.query(`SELECT * FROM "${tableName}" LIMIT 3;`);
        console.log(sample.rows);
      }
    } catch (e) {
      // ignore
    }
  }
  await c.end();
}

async function main() {
  await scanTables('DEV', DEV_URL);
  await scanTables('PROD', PROD_URL);
}

main();
