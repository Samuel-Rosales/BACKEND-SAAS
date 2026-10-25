const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway' });

async function finishBiz79() {
  const bizId = 79;
  console.log('Vinculando a Armando en Business 79...');
  const memberRes = await pool.query(`
    INSERT INTO "BusinessMember" (
      "businessId",
      "userId",
      "roleId",
      "isActive",
      "joinedAt"
    ) VALUES (
      $1,
      82,
      1,
      true,
      NOW()
    ) RETURNING id
  `, [bizId]);
  console.log('BusinessMember creado:', memberRes.rows[0]);

  console.log('Creando Depósito Principal en Business 79...');
  const depotRes = await pool.query(`
    INSERT INTO "Depot" (
      "businessId",
      name,
      location,
      "isActive"
    ) VALUES (
      $1,
      'Depósito Principal',
      'Almacén Central Mayorista',
      true
    ) RETURNING id, name
  `, [bizId]);
  console.log('Depot creado:', depotRes.rows[0]);

  console.log('Creando Categoría General en Business 79...');
  const catRes = await pool.query(`
    INSERT INTO "Category" (
      "businessId",
      name,
      "isActive"
    ) VALUES (
      $1,
      'General',
      true
    ) RETURNING id, name
  `, [bizId]);
  console.log('Category creada:', catRes.rows[0]);

  // Verificar la empresa
  const verifyBiz = await pool.query(`
    SELECT b.id, b.name, b."billingExempt", b."isWarehouseHub", bm.id as "memberId", u.name as "userName", u.ci
    FROM "Business" b
    JOIN "BusinessMember" bm ON bm."businessId" = b.id
    JOIN "User" u ON bm."userId" = u.id
    WHERE b.id = 79
  `);
  console.log('Verificación completa en PROD:', verifyBiz.rows[0]);

  pool.end();
}

finishBiz79().catch(e => { console.error('Error:', e); pool.end(); });
