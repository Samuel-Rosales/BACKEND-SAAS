const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function transferInDb(url, label, ownerMemberId, oldOwnerMemberId) {
  const c = new Client({ connectionString: url });
  await c.connect();
  console.log(`\n>>> Ejecutando transferencia en ${label}...`);

  await c.query('BEGIN');
  try {
    // 1. Promover a Armando como OWNER (roleId = 1)
    const resArmando = await c.query(`
      UPDATE "BusinessMember"
      SET "roleId" = 1, "isActive" = true
      WHERE id = $1
      RETURNING id, "businessId", "userId", "roleId", "isActive";
    `, [ownerMemberId]);
    console.log(`Armando promovido a OWNER (${label}):`, resArmando.rows[0]);

    // 2. Degradar al dueño anterior a MANAGER (roleId = 4) y desactivar
    const resOld = await c.query(`
      UPDATE "BusinessMember"
      SET "roleId" = 4, "isActive" = false
      WHERE id = $1
      RETURNING id, "businessId", "userId", "roleId", "isActive";
    `, [oldOwnerMemberId]);
    console.log(`Dueño anterior degradado y desactivado (${label}):`, resOld.rows[0]);

    await c.query('COMMIT');
    console.log(`Transferencia en ${label} COMPLETADA con éxito.`);
  } catch (err) {
    await c.query('ROLLBACK');
    console.error(`Error en ${label}, rollback ejecutado:`, err);
    throw err;
  } finally {
    await c.end();
  }
}

async function main() {
  // PROD: Negocio 63 | Armando memberId = 104 | Antiguo dueño memberId = 92
  await transferInDb(PROD_URL, 'PRODUCCIÓN', 104, 92);

  // DEV: Negocio 48 | Armando memberId = 193 | Antiguo dueño memberId = 192
  await transferInDb(DEV_URL, 'DESARROLLO (DEV)', 193, 192);

  console.log('\n=== TRANSFERENCIA CONCLUIDA EN TODOS LOS AMBIENTES ===');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
