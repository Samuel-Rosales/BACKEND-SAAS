const fs = require('fs');
const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

function readDbisamStr(row, offset, size) {
    const isNotNull = row[offset];
    if (isNotNull !== 1) return '';
    const slice = row.subarray(offset + 1, offset + 1 + size);
    const nullIdx = slice.indexOf(0);
    const end = nullIdx !== -1 ? nullIdx : size;
    return slice.subarray(0, end).toString('latin1').trim();
}

function readDbisamInt32(row, offset) {
    const isNotNull = row[offset];
    if (isNotNull !== 1) return 0;
    return row.readInt32LE(offset + 1);
}

function readDbisamDouble(row, offset) {
    const isNotNull = row[offset];
    if (isNotNull !== 1) return 0;
    return row.readDoubleLE(offset + 1);
}

function readDbisamBool(row, offset) {
    const isNotNull = row[offset];
    if (isNotNull !== 1) return false;
    return row[offset + 1] === 1;
}

function readDbisamDate(row, offset) {
    const isNotNull = row[offset];
    if (isNotNull !== 1) return null;
    const days = row.readUInt32LE(offset + 1);
    if (!days) return null;
    const d = new Date(0);
    d.setUTCFullYear(1, 0, 1);
    d.setUTCDate(d.getUTCDate() + (days - 1));
    return d.toISOString().split('T')[0];
}

async function prepareMigrationData() {
    // 1. CARGAR CLIENTES
    const bufCli = fs.readFileSync('C:\\SimplyGest\\Datos\\6\\clientes.dat');
    const cliDataOffset = 34304;
    const cliRowSize = 1288;
    const cliTotalRows = bufCli.readUInt32LE(0x29);

    const clientsByCode = new Map();
    for (let r = 0; r < cliTotalRows; r++) {
        const row = bufCli.subarray(cliDataOffset + r * cliRowSize, cliDataOffset + (r + 1) * cliRowSize);
        const code = readDbisamStr(row, 25, 25);
        const name = readDbisamStr(row, 52, 100);
        const nif = readDbisamStr(row, 308, 20);
        const phone = readDbisamStr(row, 342, 20);
        const address = readDbisamStr(row, 154, 100);
        if (code) {
            clientsByCode.set(code, { code, name, nif, phone, address });
        }
    }

    // 2. CARGAR HISTOVEN
    const bufHist = fs.readFileSync('C:\\SimplyGest\\Datos\\6\\histoven.dat');
    const histDataOffset = 20480;
    const histRowSize = 576;
    const histTotalRows = bufHist.readUInt32LE(0x29);

    const invoicesMap = new Map();
    for (let r = 0; r < histTotalRows; r++) {
        const row = bufHist.subarray(histDataOffset + r * histRowSize, histDataOffset + (r + 1) * histRowSize);
        const factura = readDbisamInt32(row, 25);
        const date = readDbisamDate(row, 30);
        const clientCode = readDbisamStr(row, 89, 25);
        const total = readDbisamDouble(row, 418);
        const serie = readDbisamStr(row, 445, 1);
        if (factura > 0) {
            const key = `${serie}_${factura}`;
            if (!invoicesMap.has(key)) {
                invoicesMap.set(key, { factura, serie, clientCode, total, date });
            }
        }
    }

    // 3. CARGAR CPAGOS
    const bufCp = fs.readFileSync('C:\\SimplyGest\\Datos\\6\\cpagos.dat');
    const cpDataOffset = 7424;
    const cpRowSize = 80;
    const cpTotalRows = bufCp.readUInt32LE(0x29);

    const pendingInvoices = [];
    const clientDebtsMap = new Map();

    for (let r = 0; r < cpTotalRows; r++) {
        const row = bufCp.subarray(cpDataOffset + r * cpRowSize, cpDataOffset + (r + 1) * cpRowSize);
        const factura = readDbisamInt32(row, 30);
        const serie = readDbisamStr(row, 35, 1);
        const amount = readDbisamDouble(row, 38);
        const date = readDbisamDate(row, 47);
        const mov = readDbisamStr(row, 52, 8);
        const hecho = readDbisamBool(row, 67);

        if (mov === 'VENTA' && !hecho && amount > 0) {
            const invKey = `${serie}_${factura}`;
            const inv = invoicesMap.get(invKey);
            const clientCode = inv?.clientCode || '0000';
            const client = clientsByCode.get(clientCode) || {
                code: clientCode,
                name: 'CLIENTE DIVERSO MULTIHOGAR',
                nif: '',
                phone: '',
                address: ''
            };

            const item = {
                factura,
                serie,
                amount: Math.round(amount * 100) / 100,
                dueDate: date || inv?.date || '2026-01-01',
                clientCode,
                client
            };
            pendingInvoices.push(item);

            if (!clientDebtsMap.has(clientCode)) {
                clientDebtsMap.set(clientCode, {
                    client,
                    totalDebt: 0,
                    invoices: []
                });
            }
            const cd = clientDebtsMap.get(clientCode);
            cd.totalDebt += item.amount;
            cd.invoices.push(item);
        }
    }

    return { clientsByCode, clientDebtsMap, pendingInvoices };
}

async function testOrRunMigration(isDryRun = true) {
    const data = await prepareMigrationData();
    console.log(`[${isDryRun ? 'DRY-RUN' : 'LIVE'}] Clientes únicos con deuda:`, data.clientDebtsMap.size);
    console.log(`[${isDryRun ? 'DRY-RUN' : 'LIVE'}] Facturas/cuotas a migrar:`, data.pendingInvoices.length);
    const sum = data.pendingInvoices.reduce((a, b) => a + b.amount, 0);
    console.log(`[${isDryRun ? 'DRY-RUN' : 'LIVE'}] Monto total a migrar: $${sum.toFixed(2)}`);

    if (isDryRun) {
        console.log('Dry run completado exitosamente sin tocar la base de datos.');
        return;
    }

    const c = new Client({ connectionString: PROD_URL });
    await c.connect();
    console.log('\n>>> Conectado a Producción. Iniciando inyección en Multihogar (ID 75)...');

    try {
        await c.query('BEGIN');

        // 1. Obtener o crear Categoría General para Multihogar
        let catRes = await c.query('SELECT id FROM "Category" WHERE "businessId" = 75 LIMIT 1;');
        let categoryId;
        if (catRes.rows.length === 0) {
            const insCat = await c.query(`
                INSERT INTO "Category" ("businessId", name, "isActive")
                VALUES (75, 'General', true)
                RETURNING id;
            `);
            categoryId = insCat.rows[0].id;
        } else {
            categoryId = catRes.rows[0].id;
        }

        // 2. Obtener o crear Producto de Servicio de Migración
        let prodRes = await c.query('SELECT id FROM "Product" WHERE "businessId" = 75 AND sku = \'MIGRA-REC-01\';');
        let serviceProductId;
        if (prodRes.rows.length === 0) {
            const insProd = await c.query(`
                INSERT INTO "Product" (
                    "businessId", "categoryId", "unitId", "taxId",
                    name, sku, type, "costPrice", "profitMargin", "salePrice",
                    "isActive", "updatedAt"
                ) VALUES (
                    75, $1, 1, 2,
                    'Saldo Inicial - Factura a Crédito Migrada', 'MIGRA-REC-01', 'SERVICE', 0, 0, 1,
                    true, NOW()
                ) RETURNING id;
            `, [categoryId]);
            serviceProductId = insProd.rows[0].id;
            console.log(`Producto de servicio creado con ID: ${serviceProductId}`);
        } else {
            serviceProductId = prodRes.rows[0].id;
        }

        const rateRes = await c.query('SELECT id FROM "ExchangeRate" WHERE "businessId" = 75 AND "isActive" = true ORDER BY id DESC LIMIT 1;');
        const exchangeRateId = rateRes.rows[0]?.id || 257;
        console.log(`ExchangeRate ID usado: ${exchangeRateId}`);

        // 3. Crear Clientes en la Base de Datos
        const dbClientIdMap = new Map();
        let cIdx = 0;
        for (const [code, item] of data.clientDebtsMap.entries()) {
            cIdx++;
            const cli = item.client;
            const ci = cli.nif && cli.nif.trim() ? cli.nif.trim() : `V-${code}`;
            const name = cli.name || `CLIENTE ${code}`;
            const phone = cli.phone || null;
            const address = cli.address || null;

            if (cIdx % 20 === 0 || cIdx === 1) {
                console.log(`Procesando cliente ${cIdx}/${data.clientDebtsMap.size}: ${name}`);
            }

            let existing = await c.query('SELECT id FROM "Client" WHERE "businessId" = 75 AND (ci = $1 OR name = $2);', [ci, name]);
            let clientId;
            if (existing.rows.length === 0) {
                const insCli = await c.query(`
                    INSERT INTO "Client" ("businessId", name, ci, phone, address, "isActive", "allowCredit", "currentDebt", "createdAt")
                    VALUES (75, $1, $2, $3, $4, true, true, $5, NOW())
                    RETURNING id;
                `, [name, ci, phone, address, item.totalDebt]);
                clientId = insCli.rows[0].id;
            } else {
                clientId = existing.rows[0].id;
                await c.query('UPDATE "Client" SET "currentDebt" = $1 WHERE id = $2;', [item.totalDebt, clientId]);
            }
            dbClientIdMap.set(code, clientId);
        }
        console.log(`Procesados ${dbClientIdMap.size} clientes en la tabla Client.`);

        // 4. Crear Ventas a Crédito y Cuotas
        let insertedSales = 0;
        for (const inv of data.pendingInvoices) {
            const clientId = dbClientIdMap.get(inv.clientCode);
            if (!clientId) continue;

            const receiptNumber = inv.factura;
            const amount = inv.amount;
            const dueDate = inv.dueDate && inv.dueDate !== 'N/A' ? new Date(inv.dueDate) : new Date();

            const saleRes = await c.query(`
                INSERT INTO "Sale" (
                    "businessId", "receiptNumber", "memberId", "clientId", "exchangeRateId",
                    type, status, conditions, "paymentStatus",
                    "subTotal", "taxAmount", discount, "totalAmount",
                    "remainingBalance", "paymentDueDate", "createdAt", "updatedAt"
                ) VALUES (
                    75, $1, 115, $2, $3,
                    'RETAIL', 'COMPLETED', 'CREDIT', 'PENDING',
                    $4, 0, 0, $4,
                    $4, $5, $5, NOW()
                ) RETURNING id;
            `, [receiptNumber, clientId, exchangeRateId, amount, dueDate]);

            const saleId = saleRes.rows[0].id;

            // SaleItem
            await c.query(`
                INSERT INTO "SaleItem" ("saleId", "productId", quantity, "unitPrice", "subTotal")
                VALUES ($1, $2, 1, $3, $3);
            `, [saleId, serviceProductId, amount]);

            // SaleInstallment
            await c.query(`
                INSERT INTO "SaleInstallment" ("saleId", number, amount, "amountPaid", "dueDate", status)
                VALUES ($1, 1, $2, 0, $3, 'PENDING');
            `, [saleId, amount, dueDate]);

            insertedSales++;
            if (insertedSales % 50 === 0 || insertedSales === 1) {
                console.log(`Inyectando venta ${insertedSales}/${data.pendingInvoices.length} (Fac #${receiptNumber} - $${amount})...`);
            }
        }

        await c.query('COMMIT');
        console.log(`\n>>> ¡ÉXITO TOTAL! Se inyectaron ${insertedSales} ventas a crédito para ${dbClientIdMap.size} clientes en Multihogar.`);
    } catch (e) {
        await c.query('ROLLBACK');
        console.error('Error durante la migración, se hizo ROLLBACK:', e);
        throw e;
    } finally {
        await c.end();
    }
}

const isLive = process.argv.includes('--live');
testOrRunMigration(!isLive).catch(console.error);
