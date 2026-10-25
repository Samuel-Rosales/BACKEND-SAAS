const fs = require('fs');

function inspectTable(filePath) {
    console.log('\n========================================');
    console.log('Inspecting:', filePath);
    const buf = fs.readFileSync(filePath);
    const totalRows = buf.readUInt32LE(0x29);
    const rowSize = buf.readUInt16LE(0x2D);
    const numFields = buf.readUInt16LE(0x2F);
    console.log('Rows:', totalRows, '| RowSize:', rowSize, '| Fields:', numFields);

    const fields = [];
    for (let i = 0; i < numFields; i++) {
        const fOffset = 0x200 + i * 768;
        const colIndex = buf.readUInt16LE(fOffset);
        const nameLen = buf.readUInt8(fOffset + 2);
        const name = buf.subarray(fOffset + 3, fOffset + 3 + nameLen).toString('latin1');
        const typeId = buf.readUInt16LE(fOffset + 0xA4);
        const size = buf.readUInt16LE(fOffset + 0xA6);
        const offset = buf.readUInt16LE(fOffset + 0xAC);
        fields.push({ colIndex, name, typeId, size, offset });
        console.log(`  #${String(colIndex).padStart(2)} ${name.padEnd(16)} type=${String(typeId).padStart(4)} size=${String(size).padStart(4)} offset=${offset}`);
    }

    const dataOffset = 0x200 + numFields * 768;
    console.log('Data offset:', dataOffset, 'Total file size:', buf.length);
    return { fields, totalRows, rowSize, dataOffset, buf };
}

inspectTable('C:\\SimplyGest\\Datos\\6\\clientes.dat');
inspectTable('C:\\SimplyGest\\Datos\\6\\cpagos.dat');
inspectTable('C:\\SimplyGest\\Datos\\6\\histoven.dat');
inspectTable('C:\\SimplyGest\\Datos\\6\\ventas.dat');
