const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

const topTaxpayers = [
  { ci: '000000010', name: 'SERVICIO NACIONAL INTEGRADO DE ADMINISTRACION ADUANERA Y TRIBUTARIA', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 100 },
  { ci: '000063729', name: 'CERVECERIA POLAR C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '000122482', name: 'BANCO DE VENEZUELA S.A. BANCO UNIVERSAL', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '070133805', name: 'BANCO MERCANTIL C.A. BANCO UNIVERSAL', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '070133805', name: 'BANESCO BANCO UNIVERSAL C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '000186235', name: 'C.A. NACIONAL TELEFONOS DE VENEZUELA CANTV', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '000186243', name: 'TELECOMUNICACIONES MOVILNET C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '003502298', name: 'TELEFONICA VENEZOLANA C.A. (MOVISTAR)', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '304689713', name: 'CORPORACION DIGITEL C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '000202001', name: 'FARMATODO C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '000547149', name: 'CENTRAL MADEREYNSE C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '000301140', name: 'AUTOMERCADOS PLAZA S C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '300971279', name: 'EXCELSIOR GAMA SUPERMERCADOS C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '000412855', name: 'FERRETERIA EPA C.A.', taxpayerType: 'ESPECIAL', isRetentionAgent: true, retentionPercentage: 75 },
  { ci: '15848341', name: 'BEATRIZ ELENA MADRID MOSQUERA', taxpayerType: 'ORDINARIO', isRetentionAgent: false, retentionPercentage: 0 },
  { ci: '14245074', name: 'NORYS CELINA CARRASCO CRESPO', taxpayerType: 'ORDINARIO', isRetentionAgent: false, retentionPercentage: 0 }
];

async function seed(connStr, envName) {
  const c = new Client({ connectionString: connStr });
  await c.connect();

  for (const t of topTaxpayers) {
    await c.query(`
      INSERT INTO "TaxpayerCache" (ci, name, "taxpayerType", "isRetentionAgent", "retentionPercentage")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (ci) DO UPDATE SET 
        name = EXCLUDED.name, 
        "taxpayerType" = EXCLUDED."taxpayerType",
        "isRetentionAgent" = EXCLUDED."isRetentionAgent",
        "retentionPercentage" = EXCLUDED."retentionPercentage";
    `, [t.ci, t.name, t.taxpayerType, t.isRetentionAgent, t.retentionPercentage]);
  }

  const count = await c.query('SELECT COUNT(*) FROM "TaxpayerCache"');
  console.log(`[${envName}] Top taxpayers seeded. Total cache size: ${count.rows[0].count}`);
  await c.end();
}

async function main() {
  await seed(DEV_URL, 'DEV');
  await seed(PROD_URL, 'PROD');
}

main().catch(console.error);
