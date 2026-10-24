const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function getMigrationSql() {
  const client = new Client({ connectionString: PROD_URL });
  await client.connect();
  const res = await client.query("SELECT migration_name, checksum, logs FROM _prisma_migrations WHERE migration_name LIKE '%quotation%';");
  console.log('Migration record:', res.rows);
  await client.end();
}

getMigrationSql();
