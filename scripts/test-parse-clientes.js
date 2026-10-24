const fs = require('fs');
const buf = fs.readFileSync('C:\\SimplyGest\\Datos\\6\\clientes.dat');
const dataOffset = 34304;
const rowSize = 1288;

function readDbisamStr(row, offset, size) {
    const isNotNull = row[offset];
    if (isNotNull !== 1) return '';
    const slice = row.subarray(offset + 1, offset + 1 + size);
    const nullIdx = slice.indexOf(0);
    const end = nullIdx !== -1 ? nullIdx : size;
    return slice.subarray(0, end).toString('latin1').trim();
}

console.log('--- SAMPLE CLIENTS FROM MULTIHOGAR ---');
for (let r = 0; r < 20; r++) {
    const row = buf.subarray(dataOffset + r * rowSize, dataOffset + (r + 1) * rowSize);
    const codigo = readDbisamStr(row, 25, 25);
    const nombre = readDbisamStr(row, 52, 100);
    const nif = readDbisamStr(row, 308, 20);
    const tlf = readDbisamStr(row, 342, 20);
    const dir = readDbisamStr(row, 154, 100);
    if (nombre) {
        console.log(`[#${r}] COD: ${codigo.padEnd(8)} | NIF: ${nif.padEnd(14)} | NOMBRE: ${nombre.padEnd(30)} | TEL: ${tlf.padEnd(15)} | DIR: ${dir}`);
    }
}
