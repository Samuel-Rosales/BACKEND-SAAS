const { Client } = require('pg');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function investigate(url, label) {
    const c = new Client({ connectionString: url });
    await c.connect();
    console.log(`\n========================================`);
    console.log(`>>> Investigando en: ${label}`);
    console.log(`========================================`);

    // 1. Buscar la empresa
    const bizRes = await c.query(`
        SELECT id, name, address, "createdAt"
        FROM "Business"
        WHERE name ILIKE '%Guaro%' OR name ILIKE '%Inversiones Los Guaros%'
    `);
    console.log('Negocios encontrados:', bizRes.rows);

    for (const biz of bizRes.rows) {
        console.log(`\n--- Negocio ID: ${biz.id} (${biz.name}) ---`);

        // 2. Buscar categorías
        const catRes = await c.query(`
            SELECT id, name, "createdAt"
            FROM "Category"
            WHERE "businessId" = $1
            ORDER BY id ASC
        `, [biz.id]);
        console.log('Categorías del negocio:', catRes.rows);

        // 3. Buscar productos que coincidan con "chicle", "tattoo", o agregados recientemente
        const prodRes = await c.query(`
            SELECT p.id, p.name, p.barcode, p.cost, p.price, p."costUsd", p."priceUsd", 
                   p."categoryId", c.name as category_name, p."createdAt", p."updatedAt"
            FROM "Product" p
            LEFT JOIN "Category" c ON p."categoryId" = c.id
            WHERE p."businessId" = $1
            ORDER BY p."createdAt" DESC
            LIMIT 30
        `, [biz.id]);
        console.log(`Últimos 30 productos creados en ${biz.name}:`);
        console.table(prodRes.rows);

        // 4. Buscar específicamente chicle o tattoo
        const chicleRes = await c.query(`
            SELECT p.id, p.name, p.barcode, p.cost, p.price, p."costUsd", p."priceUsd", 
                   p."categoryId", c.name as category_name, p."createdAt", p."updatedAt"
            FROM "Product" p
            LEFT JOIN "Category" c ON p."categoryId" = c.id
            WHERE p."businessId" = $1 AND (p.name ILIKE '%chicle%' OR p.name ILIKE '%tattoo%' OR p.name ILIKE '%tatu%')
        `, [biz.id]);
        console.log('Búsqueda específica de "chicle / tattoo":', chicleRes.rows);

        // 5. Total de inventario valorizado (Stock * Costo o Stock * Precio)
        const invSummary = await c.query(`
            SELECT 
                COUNT(DISTINCT p.id) as total_products,
                SUM(i.quantity) as total_units,
                SUM(i.quantity * COALESCE(p.cost, p."costUsd", 0)) as total_cost_bs,
                SUM(i.quantity * COALESCE(p."costUsd", p.cost, 0)) as total_cost_usd,
                SUM(i.quantity * COALESCE(p."priceUsd", p.price, 0)) as total_price_usd,
                SUM(i.quantity * COALESCE(p.price, p."priceUsd", 0)) as total_price_bs
            FROM "Inventory" i
            JOIN "Product" p ON i."productId" = p.id
            WHERE p."businessId" = $1
        `, [biz.id]);
        console.log('Resumen de Inventario valorizado:', invSummary.rows[0]);

        // 6. Inventario por producto de los últimos creados
        const invDetails = await c.query(`
            SELECT p.id, p.name, c.name as category, i.quantity, p."costUsd", p."priceUsd",
                   (i.quantity * COALESCE(p."costUsd", 0)) as total_cost_item_usd,
                   (i.quantity * COALESCE(p."priceUsd", 0)) as total_price_item_usd,
                   i."updatedAt"
            FROM "Inventory" i
            JOIN "Product" p ON i."productId" = p.id
            LEFT JOIN "Category" c ON p."categoryId" = c.id
            WHERE p."businessId" = $1
            ORDER BY p."createdAt" DESC
            LIMIT 15
        `, [biz.id]);
        console.log('Detalle de stock de los últimos productos:');
        console.table(invDetails.rows);
    }

    await c.end();
}

async function run() {
    try {
        await investigate(PROD_URL, 'PRODUCCIÓN');
    } catch (e) {
        console.error('Error en Prod:', e);
    }
}

run();
