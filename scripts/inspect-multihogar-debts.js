const fs = require('fs');

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

// 2. CARGAR HISTOVEN (FACTURAS Y SUS CLIENTES)
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

// 3. CARGAR CPAGOS (CUENTAS POR COBRAR PENDIENTES)
const bufCp = fs.readFileSync('C:\\SimplyGest\\Datos\\6\\cpagos.dat');
const cpDataOffset = 7424;
const cpRowSize = 80;
const cpTotalRows = bufCp.readUInt32LE(0x29);

const clientDebts = new Map();
let globalTotal = 0;
let totalUnpaidInstallments = 0;

for (let r = 0; r < cpTotalRows; r++) {
    const row = bufCp.subarray(cpDataOffset + r * cpRowSize, cpDataOffset + (r + 1) * cpRowSize);
    const factura = readDbisamInt32(row, 30);
    const serie = readDbisamStr(row, 35, 1);
    const amount = readDbisamDouble(row, 38);
    const date = readDbisamDate(row, 47);
    const mov = readDbisamStr(row, 52, 8);
    const hecho = readDbisamBool(row, 67);

    if (mov === 'VENTA' && !hecho && amount > 0) {
        totalUnpaidInstallments++;
        globalTotal += amount;
        const invKey = `${serie}_${factura}`;
        const inv = invoicesMap.get(invKey);
        const clientCode = inv?.clientCode || 'S_N';
        const client = clientsByCode.get(clientCode) || {
            code: clientCode,
            name: 'CLIENTE NO IDENTIFICADO',
            nif: '',
            phone: '',
            address: ''
        };

        if (!clientDebts.has(clientCode)) {
            clientDebts.set(clientCode, {
                client,
                totalDebt: 0,
                invoices: []
            });
        }

        const cd = clientDebts.get(clientCode);
        cd.totalDebt += amount;
        cd.invoices.push({
            factura,
            serie,
            amount,
            dueDate: date || inv?.date || 'N/A'
        });
    }
}

console.log('====================================================');
console.log('   AUDITORÍA FORENSE DE CUENTAS POR COBRAR: MULTIHOGAR');
console.log('====================================================');
console.log(`Clientes totales en sistema: ${clientsByCode.size}`);
console.log(`Clientes con saldo deudor pendiente: ${clientDebts.size}`);
console.log(`Total de cuotas/facturas por cobrar: ${totalUnpaidInstallments}`);
console.log(`MONTO GLOBAL TOTAL POR COBRAR: $${globalTotal.toFixed(2)} USD`);
console.log('====================================================');

// Ordenar clientes por mayor deuda
const sorted = [...clientDebts.values()].sort((a, b) => b.totalDebt - a.totalDebt);
console.log('\nTOP 15 CLIENTES CON MAYOR DEUDA PENDIENTE:');
sorted.slice(0, 15).forEach((item, idx) => {
    const c = item.client;
    console.log(`${String(idx + 1).padStart(2)}. ${c.name.padEnd(28)} | CI/RIF: ${c.nif.padEnd(12)} | Deuda: $${item.totalDebt.toFixed(2).padStart(9)} (${item.invoices.length} fact/cuotas)`);
});
