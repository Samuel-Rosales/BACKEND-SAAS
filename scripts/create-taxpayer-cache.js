const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function setupDatabase(connStr, envName) {
  console.log(`Setting up TaxpayerCache in ${envName}...`);
  const c = new Client({ connectionString: connStr });
  await c.connect();

  await c.query(`
    CREATE TABLE IF NOT EXISTS "TaxpayerCache" (
      id SERIAL PRIMARY KEY,
      ci VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      "taxpayerType" VARCHAR(50) DEFAULT 'ORDINARIO',
      "isRetentionAgent" BOOLEAN DEFAULT false,
      "retentionPercentage" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert test records
  const records = [
    { ci: '15848341', name: 'BEATRIZ ELENA MADRID MOSQUERA', taxpayerType: 'ORDINARIO', isRetentionAgent: false, retentionPercentage: 0 },
    { ci: '14245074', name: 'NORYS CELINA CARRASCO CRESPO', taxpayerType: 'ORDINARIO', isRetentionAgent: false, retentionPercentage: 0 },
    { ci: '000063729', name: 'CERVECERIA POLAR C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
    { ci: '000000010', name: 'SERVICIO NACIONAL INTEGRADO DE ADMINISTRACION ADUANERA Y TRIBUTARIA', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 100 }
  ];

  for (const r of records) {
    await c.query(`
      INSERT INTO "TaxpayerCache" (ci, name, "taxpayerType", "isRetentionAgent", "retentionPercentage")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (ci) DO UPDATE SET name = EXCLUDED.name, "taxpayerType" = EXCLUDED."taxpayerType";
    `, [r.ci, r.name, r.taxpayerType, r.isRetentionAgent, r.retentionPercentage]);
  }

  const rows = await c.query('SELECT ci, name, "taxpayerType" FROM "TaxpayerCache" LIMIT 10;');
  console.log(`[${envName}] TaxpayerCache count: ${rows.rowCount}`, rows.rows);

  await c.end();
}

async function main() {
  await setupDatabase(DEV_URL, 'DEV');
  await setupDatabase(PROD_URL, 'PROD');
}

main().catch(console.error);
