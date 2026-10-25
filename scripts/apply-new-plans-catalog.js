const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function updatePlans(url, label) {
  const c = new Client({ connectionString: url });
  await c.connect();
  console.log(`\n========================================`);
  console.log(`>>> Actualizando planes en ${label}...`);
  console.log(`========================================`);

  await c.query('BEGIN');
  try {
    // 1. Si hay negocios en ENTERPRISE, migrarlos a PREMIUM
    const migRes = await c.query(`
      UPDATE "Subscription"
      SET "planType" = 'PREMIUM', "planId" = 3
      WHERE "planType" = 'ENTERPRISE' OR "planId" = 5
      RETURNING id, "businessId", "planType", "planId";
    `);
    console.log(`Suscripciones migradas de ENTERPRISE a PREMIUM (${label}):`, migRes.rows.length);

    // 2. Desactivar plan ENTERPRISE si existe
    await c.query(`
      UPDATE "SubscriptionPlan"
      SET "isActive" = false
      WHERE code = 'ENTERPRISE' OR id = 5;
    `);

    // 3. Renombrar BASIC a "Plan Comercial" con precio 15.00
    const resBasic = await c.query(`
      UPDATE "SubscriptionPlan"
      SET name = 'Plan Comercial', "priceMonthly" = 15.00, "isActive" = true
      WHERE code = 'BASIC' OR id = 2
      RETURNING id, code, name, "priceMonthly", "isActive";
    `);
    console.log(`Plan Básico renombrado a Plan Comercial (${label}):`, resBasic.rows[0]);

    // 4. Actualizar PREMIUM con precio 25.00 y nombre "Plan Premium"
    const resPremium = await c.query(`
      UPDATE "SubscriptionPlan"
      SET name = 'Plan Premium', "priceMonthly" = 25.00, "isActive" = true
      WHERE code = 'PREMIUM' OR id = 3
      RETURNING id, code, name, "priceMonthly", "isActive";
    `);
    console.log(`Plan Premium actualizado a $25 (${label}):`, resPremium.rows[0]);

    // 5. Asegurar DEMO activo con precio 0.00
    const resDemo = await c.query(`
      UPDATE "SubscriptionPlan"
      SET name = 'Demo', "priceMonthly" = 0.00, "isActive" = true
      WHERE code = 'TRIAL' OR id = 1
      RETURNING id, code, name, "priceMonthly", "isActive";
    `);
    console.log(`Plan Demo confirmado (${label}):`, resDemo.rows[0]);

    // 6. Actualizar precios en SubscriptionPlanPrice para 1 mes
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 15.00
      WHERE "planId" = 2 AND months = 1;
    `);
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 45.00
      WHERE "planId" = 2 AND months = 3;
    `);
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 90.00
      WHERE "planId" = 2 AND months = 6;
    `);
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 180.00
      WHERE "planId" = 2 AND months = 12;
    `);

    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 25.00
      WHERE "planId" = 3 AND months = 1;
    `);
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 75.00
      WHERE "planId" = 3 AND months = 3;
    `);
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 150.00
      WHERE "planId" = 3 AND months = 6;
    `);
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET price = 300.00
      WHERE "planId" = 3 AND months = 12;
    `);

    // Desactivar precios de ENTERPRISE
    await c.query(`
      UPDATE "SubscriptionPlanPrice"
      SET "isActive" = false
      WHERE "planId" = 5;
    `);

    await c.query('COMMIT');
    console.log(`>>> Planes en ${label} actualizados EXITOSAMENTE.`);
  } catch (err) {
    await c.query('ROLLBACK');
    console.error(`Error en ${label}, rollback:`, err);
    throw err;
  } finally {
    await c.end();
  }
}

async function main() {
  await updatePlans(DEV_URL, 'DESARROLLO (DEV)');
  await updatePlans(PROD_URL, 'PRODUCCIÓN');
  console.log('\n=== CATÁLOGO DE PLANES SINCRONIZADO EN AMBOS AMBIENTES ===');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
