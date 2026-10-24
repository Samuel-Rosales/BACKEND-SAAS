const { Client } = require('pg');
async function test() {
  for (const env of [
    { name: 'DEV', url: 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway' },
    { name: 'PROD', url: 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway' }
  ]) {
    const c = new Client({ connectionString: env.url });
    await c.connect();
    const count = await c.query('SELECT COUNT(*) FROM "Client"');
    console.log(`[${env.name}] Total Clients:`, count.rows[0].count);
    
    // Check how many have valid names and CI
    const valid = await c.query('SELECT ci, name FROM "Client" WHERE name IS NOT NULL AND ci IS NOT NULL LIMIT 5');
    console.log(`[${env.name}] Sample:`, valid.rows);
    await c.end();
  }
}
test().catch(console.error);
