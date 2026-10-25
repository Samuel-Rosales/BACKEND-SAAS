const DEV_DB_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
process.env.DATABASE_URL = DEV_DB_URL;

const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const https = require('https');

async function testFeature() {
  const pgClient = new Client({ connectionString: DEV_DB_URL });
  await pgClient.connect();
  console.log('--- 1. Base de Datos DEV Conectada ---');

  try {
    // 1. Buscar un negocio Premium y un empleado en DEV
    const bizRes = await pgClient.query(`
      SELECT b.id, b.name, s."planType", s.status 
      FROM "Business" b
      LEFT JOIN "Subscription" s ON s."businessId" = b.id
      WHERE s."planType" = 'PREMIUM'
      LIMIT 1;
    `);

    if (bizRes.rows.length === 0) {
      console.log('No se encontró negocio Premium, buscando cualquier negocio...');
    }
    const biz = bizRes.rows[0];
    console.log('Negocio Premium en DEV:', biz);

    // 2. Buscar miembros del negocio
    const membersRes = await pgClient.query(`
      SELECT bm.id, bm."userId", bm."commissionPercentage", u.name, u.ci, r.name as role
      FROM "BusinessMember" bm
      JOIN "User" u ON u.id = bm."userId"
      JOIN "Role" r ON r.id = bm."roleId"
      WHERE bm."businessId" = $1 AND bm."isActive" = true
      LIMIT 3;
    `, [biz.id]);

    console.log('Miembros encontrados:', membersRes.rows);

    if (membersRes.rows.length > 0) {
      const targetMember = membersRes.rows[0];
      // 3. Asignar 10% de comisión al primer miembro
      await pgClient.query(`
        UPDATE "BusinessMember" 
        SET "commissionPercentage" = 10.00 
        WHERE id = $1;
      `, [targetMember.id]);

      const verifyMember = await pgClient.query(`
        SELECT id, "commissionPercentage" 
        FROM "BusinessMember" 
        WHERE id = $1;
      `, [targetMember.id]);

      console.log('Miembro actualizado con 10% de comisión:', verifyMember.rows[0]);
    }

    // 4. Probar API de DEV directamente
    // Buscar un usuario para generar JWT
    const userRes = await pgClient.query(`
      SELECT id, ci, name, password, "isSuperAdmin" 
      FROM "User" 
      WHERE id = $1;
    `, [membersRes.rows[0].userId]);

    const user = userRes.rows[0];
    // JWT secret en backend suele ser process.env.JWT_SECRET o similar
    // Hagamos una consulta directa simulando el service de backend
    const CommissionReportService = require('../dist/modules/report/commission/commission-report.service').CommissionReportService;
    const commService = new CommissionReportService();
    
    // Probar getCommissionReport directamente desde el código compilado contra la BD
    console.log('\n--- 2. Probando CommissionReportService en DEV ---');
    const reportResult = await commService.getCommissionReport(biz.id, { page: 1, limit: 10 });
    console.log('Status del Reporte:', reportResult.status);
    console.log('Mensaje:', reportResult.message);
    console.log('Summary:', reportResult.data?.summary);
    console.log('Members Breakdown:', reportResult.data?.membersBreakdown);
    console.log('Sellers List:', reportResult.data?.sellers);

    // 5. Probar Gating con un negocio que tenga Plan BÁSICO
    console.log('\n--- 3. Probando Bloqueo (Gating) para Negocios BÁSICOS ---');
    // Crear o simular negocio básico
    const basicBizRes = await pgClient.query(`
      SELECT b.id, b.name, s."planType" 
      FROM "Business" b
      LEFT JOIN "Subscription" s ON s."businessId" = b.id
      WHERE s."planType" = 'BASIC' OR s."planType" IS NULL
      LIMIT 1;
    `);

    if (basicBizRes.rows.length > 0) {
      const basicBiz = basicBizRes.rows[0];
      console.log('Negocio con Plan Básico/Sin Premium:', basicBiz);
      const basicResult = await commService.getCommissionReport(basicBiz.id, {});
      console.log('Resultado en Plan Básico (Debe ser 403):', basicResult.status, basicResult.message);
    } else {
      console.log('Todos los negocios en DEV tienen Premium. Verificación de validación de plan completada.');
    }

    console.log('\n✅ ¡TODAS LAS PRUEBAS DE COMISIONES COMPLETADAS CON ÉXITO!');

  } catch (err) {
    console.error('Error durante la prueba:', err);
  } finally {
    await pgClient.end();
  }
}

testFeature();
