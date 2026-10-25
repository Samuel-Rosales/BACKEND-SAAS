const { Client } = require('pg');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function updateTaxes() {
  const client = new Client({ connectionString: PROD_URL });
  await client.connect();

  console.log('>>> Conectado a la base de datos de PRODUCCIÓN...');
  try {
    await client.query('BEGIN');

    // 1. Verificar estado antes
    const beforeStats = await client.query(`
      SELECT p."taxId", t.name as "taxName", t.rate as "taxRate", count(*) as total
      FROM "Product" p
      LEFT JOIN "Tax" t ON p."taxId" = t.id
      WHERE p."businessId" = 73
      GROUP BY p."taxId", t.name, t.rate;
    `);
    console.log('Estado ANTES del cambio para Negocio 73:');
    console.table(beforeStats.rows);

    // 2. Ejecutar UPDATE
    const updateRes = await client.query(`
      UPDATE "Product"
      SET "taxId" = 2, "updatedAt" = NOW()
      WHERE "businessId" = 73 AND "taxId" != 2;
    `);
    console.log(`>>> Filas actualizadas: ${updateRes.rowCount}`);

    // 3. Verificar estado después
    const afterStats = await client.query(`
      SELECT p."taxId", t.name as "taxName", t.rate as "taxRate", count(*) as total
      FROM "Product" p
      LEFT JOIN "Tax" t ON p."taxId" = t.id
      WHERE p."businessId" = 73
      GROUP BY p."taxId", t.name, t.rate;
    `);
    console.log('Estado DESPUÉS del cambio para Negocio 73:');
    console.table(afterStats.rows);

    const nonExempt = await client.query(`
      SELECT count(*) FROM "Product" WHERE "businessId" = 73 AND "taxId" != 2;
    `);

    if (parseInt(nonExempt.rows[0].count, 10) === 0) {
      await client.query('COMMIT');
      console.log('>>> ¡TRANSACCIÓN COMPLETADA Y CONFIRMADA CON ÉXITO! <<<');
      console.log('Todos los productos de Inversiones J&M de Glendy Ramirez (ID 73) ahora tienen impuesto Exento (0% IVA).');
    } else {
      await client.query('ROLLBACK');
      console.error('Error: Todavía existen productos no exentos. Se hizo ROLLBACK.');
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la actualización:', err.message);
  } finally {
    await client.end();
  }
}

updateTaxes();
