const fs = require('fs');
const readline = require('readline');

async function main() {
    const filePath = 'C:\\Users\\e\\.gemini\\antigravity\\brain\\140b00e2-0bb3-408a-800c-3ce6d4d21781\\.system_generated\\logs\\transcript.jsonl';
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (line.includes('EAAC3501') && line.includes('CATEGORIA,CODIGO,PRODUCTO')) {
            const startIdx = line.indexOf('CATEGORIA,CODIGO,PRODUCTO');
            const endIdx = line.indexOf('TOTAL,39059.778299999947');
            const raw = line.slice(startIdx, endIdx !== -1 ? endIdx + 40 : startIdx + 40000);
            
            // Unescape JSON string characters
            const cleaned = JSON.parse(`"${raw.replace(/"/g, '\\"')}"`)
                .replace(/\\r\\n/g, '\n')
                .replace(/\\n/g, '\n');

            fs.writeFileSync('C:\\Users\\e\\Documents\\Guardian\\back\\scripts\\emtop_audit.csv', cleaned);
            console.log('✓ emtop_audit.csv creado exitosamente, tamaño:', cleaned.length);
            return;
        }
    }
    console.log('No se encontró el texto en el archivo');
}

main().catch(console.error);
