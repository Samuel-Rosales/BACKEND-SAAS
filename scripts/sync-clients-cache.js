const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function syncClientsToCache(connStr, envName) {
  const c = new Client({ connectionString: connStr });
  await c.connect();

  const syncQuery = `
    INSERT INTO "TaxpayerCache" (ci, name, "taxpayerType")
    SELECT DISTINCT ON (clean_ci)
      clean_ci,
      name,
      'ORDINARIO'
    FROM (
      SELECT 
        REGEXP_REPLACE(ci, '[^0-9]', '', 'g') AS clean_ci,
        name,
        id
      FROM "Client"
      WHERE ci IS NOT NULL 
        AND name IS NOT NULL 
        AND LENGTH(REGEXP_REPLACE(ci, '[^0-9]', '', 'g')) >= 4
        AND name NOT ILIKE '%cliente gen%'
        AND name NOT ILIKE '%prueba%'
      ORDER BY REGEXP_REPLACE(ci, '[^0-9]', '', 'g'), id DESC
    ) sub
    ON CONFLICT (ci) DO UPDATE SET name = EXCLUDED.name;
  `;

  await c.query(syncQuery);
  const total = await c.query('SELECT COUNT(*) FROM "TaxpayerCache"');
  console.log(`[${envName}] Synced clients to TaxpayerCache. Total cached: ${total.rows[0].count}`);
  await c.end();
}

async function main() {
  await syncClientsToCache(DEV_URL, 'DEV');
  await syncClientsToCache(PROD_URL, 'PROD');
}

main().catch(console.error);
