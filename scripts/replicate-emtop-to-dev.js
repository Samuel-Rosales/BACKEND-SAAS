const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkAndReplicate() {
  const cProd = new Client({ connectionString: PROD_URL });
  const cDev = new Client({ connectionString: DEV_URL });
  await cProd.connect();
  await cDev.connect();

  let newDevBizId;
  const existingDevBiz = await cDev.query('SELECT * FROM "Business" WHERE name ILIKE \'%EMTOP SHOP%\';');
  if (existingDevBiz.rows.length > 0) {
    newDevBizId = existingDevBiz.rows[0].id;
    console.log('Ya existe en DEV con ID:', newDevBizId);
  } else {
    console.log('No existe en DEV. Obteniendo datos de PROD para replicar...');
    const bizProd = await cProd.query('SELECT * FROM "Business" WHERE id = 63;');
    const b = bizProd.rows[0];

    // Verificar businessCategoryId en DEV
    const catDev = await cDev.query('SELECT id FROM "BusinessCategory" LIMIT 1;');
    const businessCategoryId = b.businessCategoryId || catDev.rows[0].id;

    // Insertar Business en DEV
    const insertBiz = await cDev.query(`
      INSERT INTO "Business" (
        name, address, "logoUrl", "businessCategoryId", "currentExchangeRate", 
        "rateStrategy", "defaultCreditLimit", "enableGlobalCredit", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name;
    `, [
      b.name, b.address, b.logoUrl, businessCategoryId, b.currentExchangeRate,
      b.rateStrategy, b.defaultCreditLimit, b.enableGlobalCredit
    ]);

    newDevBizId = insertBiz.rows[0].id;
    console.log(`✓ Creado negocio en DEV: [${insertBiz.rows[0].name}] con ID: ${newDevBizId}`);
  }

    // Replicar o crear Depot (Almacén principal)
    // Replicar o crear Depot (Almacén principal)
    const depotsProd = await cProd.query('SELECT * FROM "Depot" WHERE "businessId" = 63;');
    const existingDevDepots = await cDev.query('SELECT * FROM "Depot" WHERE "businessId" = $1;', [newDevBizId]);
    if (existingDevDepots.rows.length === 0) {
      if (depotsProd.rows.length > 0) {
        for (const d of depotsProd.rows) {
          await cDev.query(`
            INSERT INTO "Depot" ("businessId", name, location)
            VALUES ($1, $2, $3);
          `, [newDevBizId, d.name, d.location || 'Sede Principal']);
        }
        console.log(`✓ Replicados ${depotsProd.rows.length} depósitos a DEV.`);
      } else {
        await cDev.query(`
          INSERT INTO "Depot" ("businessId", name, location)
          VALUES ($1, 'Almacén Principal', 'Sede Central');
        `, [newDevBizId]);
        console.log('✓ Creado almacén principal por defecto en DEV.');
      }
    } else {
      console.log(`- El negocio en DEV ya tiene ${existingDevDepots.rows.length} depósitos.`);
    }

    // Replicar usuarios y membresías
    const bmCols = await cDev.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'BusinessMember';");
    const bmColNames = bmCols.rows.map(r => r.column_name);
    console.log('BusinessMember columns in DEV:', bmColNames);

    const membersProd = await cProd.query(`
      SELECT bm."userId", bm."roleId", u.ci, u.name, u.password, u."isSuperAdmin", r.name as "roleName"
      FROM "BusinessMember" bm
      JOIN "User" u ON bm."userId" = u.id
      LEFT JOIN "Role" r ON bm."roleId" = r.id
      WHERE bm."businessId" = 63;
    `);

    for (const m of membersProd.rows) {
      // Buscar si el usuario existe en DEV por CI
      let devUserRes = await cDev.query('SELECT id FROM "User" WHERE ci = $1;', [m.ci]);
      let devUserId;
      if (devUserRes.rows.length === 0) {
        const newUser = await cDev.query(`
          INSERT INTO "User" (ci, name, password, "isSuperAdmin")
          VALUES ($1, $2, $3, $4)
          RETURNING id;
        `, [m.ci, m.name, m.password, m.isSuperAdmin || false]);
        devUserId = newUser.rows[0].id;
        console.log(`✓ Creado usuario en DEV: ${m.name} (CI: ${m.ci}) con ID: ${devUserId}`);
      } else {
        devUserId = devUserRes.rows[0].id;
        console.log(`- Usuario ya existía en DEV: ${m.name} (CI: ${m.ci}) con ID: ${devUserId}`);
      }

      // Buscar rol equivalente en DEV
      const roleDev = await cDev.query('SELECT id FROM "Role" WHERE name = $1 LIMIT 1;', [m.roleName || 'Gerente']);
      const devRoleId = roleDev.rows[0]?.id || 1;

      // Crear membresía en DEV
      if (bmColNames.includes('createdAt')) {
        await cDev.query(`
          INSERT INTO "BusinessMember" ("businessId", "userId", "roleId", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT DO NOTHING;
        `, [newDevBizId, devUserId, devRoleId]);
      } else {
        await cDev.query(`
          INSERT INTO "BusinessMember" ("businessId", "userId", "roleId")
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING;
        `, [newDevBizId, devUserId, devRoleId]);
      }
      console.log(`✓ Asignada membresía en DEV a ${m.name} con rol ${m.roleName || 'Gerente'}`);
    }

  await cProd.end();
  await cDev.end();
  console.log('--- Proceso de verificación / replicación en DEV finalizado ---');
}

checkAndReplicate();
