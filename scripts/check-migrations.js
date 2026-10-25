const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function checkMigrations() {
  const clientProd = new Client({ connectionString: PROD_URL });
  await clientProd.connect();
  const prodMigrations = await clientProd.query('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;');
  console.log('PROD migrations:', prodMigrations.rows);
  await clientProd.end();

  const clientDev = new Client({ connectionString: DEV_URL });
  await clientDev.connect();
  const devMigrations = await clientDev.query('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;');
  console.log('DEV migrations:', devMigrations.rows);
  await clientDev.end();
}

checkMigrations();
