const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkDetails() {
    const c = new Client({ connectionString: PROD_URL });
    await c.connect();

    // 1. Tasa de cambio de la empresa 56
    const rateRes = await c.query(`
    SELECT b.id, b.name, b."manualRate", b."rateStrategy", e.rate, e.source, e."lastUpdate"
    FROM "Business" b
    LEFT JOIN "ExchangeRate" e ON b."currentExchangeRateId" = e.id
    WHERE b.id = 56
  `);
    console.log('Tasa de cambio del negocio 56:', rateRes.rows[0]);

    // 2. Inventario agrupado por categoría
    const catGroup = await c.query(`
    SELECT 
      c.id, c.name, 
      COUNT(p.id) as product_count,
      SUM(i.quantity) as total_units,
      SUM(i.quantity * COALESCE(p."costUsd", 0)) as total_cost_usd,
      SUM(i.quantity * COALESCE(p."priceUsd", 0)) as total_price_usd
    FROM "Category" c
    LEFT JOIN "Product" p ON p."categoryId" = c.id
    LEFT JOIN "Inventory" i ON i."productId" = p.id
    WHERE c."businessId" = 56
    GROUP BY c.id, c.name
    ORDER BY c.id ASC
  `);
    console.log('\nInventario por categoría:');
    console.table(catGroup.rows);

    // 3. Revisar si hay algún otro producto en el negocio o si se eliminó alguno
    const allProds = await c.query(`
    SELECT id, name, "categoryId", cost, price, "costUsd", "priceUsd", "isActive", "createdAt", "updatedAt"
    FROM "Product"
    WHERE "businessId" = 56
    ORDER BY id ASC
  `);
    console.log(`\nTotal productos en DB: ${allProds.rows.length}`);

    // 4. Ver qué muestra el inventario general
    const invTotal = await c.query(`
    SELECT 
      SUM(i.quantity * COALESCE(p."costUsd", 0)) as total_cost_usd,
      SUM(i.quantity * COALESCE(p."priceUsd", 0)) as total_price_usd
    FROM "Inventory" i
    JOIN "Product" p ON i."productId" = p.id
    WHERE p."businessId" = 56
  `);
    console.log('\nTotales de inventario en USD:', invTotal.rows[0]);

    await c.end();
}

checkDetails().catch(console.error);
