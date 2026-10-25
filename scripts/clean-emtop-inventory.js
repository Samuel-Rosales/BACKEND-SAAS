const { Client } = require('pg');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function cleanInventory(businessId = 63, cleanCategories = true) {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  try {
    console.log(`Iniciando limpieza de inventario para el negocio ID ${businessId}...`);
    await c.query('BEGIN');

    // 1. Eliminar movimientos de inventario del negocio
    const movRes = await c.query('DELETE FROM "StockMovement" WHERE "businessId" = $1 RETURNING id;', [businessId]);
    console.log(`✓ Eliminados ${movRes.rowCount} movimientos de inventario.`);

    // 2. Eliminar lotes de stock de los productos del negocio
    const lotRes = await c.query(`
      DELETE FROM "StockLot" 
      WHERE "productId" IN (SELECT id FROM "Product" WHERE "businessId" = $1)
      RETURNING id;
    `, [businessId]);
    console.log(`✓ Eliminados ${lotRes.rowCount} lotes de stock.`);

    // 3. Eliminar componentes / recetas
    const compRes = await c.query(`
      DELETE FROM "ProductComponent"
      WHERE "parentProductId" IN (SELECT id FROM "Product" WHERE "businessId" = $1)
         OR "childProductId" IN (SELECT id FROM "Product" WHERE "businessId" = $1)
      RETURNING id;
    `, [businessId]);
    console.log(`✓ Eliminados ${compRes.rowCount} componentes de productos.`);

    // 4. Eliminar presentaciones
    const presRes = await c.query(`
      DELETE FROM "ProductPresentation"
      WHERE "productId" IN (SELECT id FROM "Product" WHERE "businessId" = $1)
      RETURNING id;
    `, [businessId]);
    console.log(`✓ Eliminadas ${presRes.rowCount} presentaciones.`);

    // 5. Eliminar productos
    const prodRes = await c.query('DELETE FROM "Product" WHERE "businessId" = $1 RETURNING id;', [businessId]);
    console.log(`✓ Eliminados ${prodRes.rowCount} productos.`);

    // 6. Eliminar categorías creadas por importación (si aplica)
    if (cleanCategories) {
      const catRes = await c.query('DELETE FROM "Category" WHERE "businessId" = $1 RETURNING id;', [businessId]);
      console.log(`✓ Eliminadas ${catRes.rowCount} categorías.`);
    }

    await c.query('COMMIT');
    console.log(`\n¡Limpieza de inventario completada con éxito para Negocio ID ${businessId}!`);
  } catch (error) {
    await c.query('ROLLBACK');
    console.error('Error durante la limpieza, transacción revertida (ROLLBACK):', error);
  } finally {
    await c.end();
  }
}

// Si se ejecuta directamente desde terminal con confirmación
if (process.argv.includes('--execute')) {
  cleanInventory(63, true);
} else {
  console.log('Script en modo seguro (DRY RUN). Para ejecutar pase el argumento --execute.');
}
