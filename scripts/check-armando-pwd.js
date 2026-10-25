const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const user = await c.query(`SELECT id, name, ci, (password IS NOT NULL AND length(password) > 0) as "hasPassword" FROM "User" WHERE id = 82;`);
  console.log('ARMANDO User check:', user.rows[0]);

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
