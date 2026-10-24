const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function setupMultihogar() {
    const c = new Client({ connectionString: PROD_URL });
    await c.connect();

    console.log('>>> Configurando negocio Multihogar en Producción...');

    // 1. Verificar si ya existe business 75 y actualizarlo a 'Multihogar'
    const res75 = await c.query('SELECT * FROM "Business" WHERE id = 75;');
    let bizId;
    if (res75.rows.length > 0) {
        await c.query(`
            UPDATE "Business" 
            SET name = 'Multihogar', 
                address = 'Carora, Edo. Lara',
                "rateStrategy" = 'API_BCV',
                "businessCategoryId" = 1
            WHERE id = 75;
        `);
        bizId = 75;
        console.log(`Negocio ID 75 actualizado con éxito a 'Multihogar'.`);
    } else {
        const createRes = await c.query(`
            INSERT INTO "Business" (name, address, "rateStrategy", "businessCategoryId", "createdAt", "updatedAt")
            VALUES ('Multihogar', 'Carora, Edo. Lara', 'API_BCV', 1, NOW(), NOW())
            RETURNING id;
        `);
        bizId = createRes.rows[0].id;
        console.log(`Nuevo negocio creado con ID ${bizId}.`);
    }

    // 2. Asegurar membresía de Bedwin (userId 11) como OWNER (roleId 1)
    const memCheck = await c.query('SELECT * FROM "BusinessMember" WHERE "businessId" = $1 AND "userId" = 11;', [bizId]);
    let memberId;
    if (memCheck.rows.length === 0) {
        const mRes = await c.query(`
            INSERT INTO "BusinessMember" ("userId", "businessId", "roleId", "isActive", "joinedAt")
            VALUES (11, $1, 1, true, NOW())
            RETURNING id;
        `, [bizId]);
        memberId = mRes.rows[0].id;
    } else {
        memberId = memCheck.rows[0].id;
    }
    console.log(`Membresía OWNER (Bedwin) verificada con memberId: ${memberId}`);

    // 3. Asegurar Depósito Principal
    const depotCheck = await c.query('SELECT * FROM "Depot" WHERE "businessId" = $1;', [bizId]);
    if (depotCheck.rows.length === 0) {
        await c.query(`
            INSERT INTO "Depot" ("businessId", name, location, "isActive")
            VALUES ($1, 'Almacén Principal', 'Sede Principal', true);
        `, [bizId]);
        console.log('Almacén Principal creado.');
    }

    // 4. Asegurar Suscripción Activa
    const subCheck = await c.query('SELECT * FROM "Subscription" WHERE "businessId" = $1;', [bizId]);
    if (subCheck.rows.length === 0) {
        await c.query(`
            INSERT INTO "Subscription" ("businessId", "planType", status, "startDate", "endDate", "lastPaymentRef", "planId")
            VALUES ($1, 'TRIAL', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', 'ONBOARDING_MULTIHOGAR', 1);
        `, [bizId]);
        console.log('Suscripción activada.');
    }

    // 5. Asegurar Tasa Activa para Multihogar
    const rateCheck = await c.query('SELECT * FROM "ExchangeRate" WHERE "businessId" = $1 AND "isActive" = true;', [bizId]);
    if (rateCheck.rows.length === 0) {
        // Tomar la tasa más reciente
        const latestRate = await c.query('SELECT rate FROM "ExchangeRate" WHERE "isActive" = true ORDER BY id DESC LIMIT 1;');
        const rVal = latestRate.rows[0]?.rate || '880.1159';
        await c.query(`
            INSERT INTO "ExchangeRate" (rate, "isActive", "businessId", source, "createdAt")
            VALUES ($1, true, $2, 'API_BCV', NOW());
        `, [rVal, bizId]);
        console.log(`Tasa de cambio asignada: ${rVal}`);
    }

    console.log(`\n>>> ¡NEGOCIO MULTIHOGAR (ID ${bizId}) CONFIGURADO Y ACTIVO EN PRODUCCIÓN! <<<`);
    await c.end();
}

setupMultihogar().catch(console.error);
