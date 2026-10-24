const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkProdEdgar() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();
  const acts = await c.query("SELECT pid, state, wait_event_type, wait_event, left(query, 60) as q FROM pg_stat_activity WHERE state != 'idle';");
  console.log('Active queries:', acts.rows);
  await c.end();
}

checkProdEdgar();
