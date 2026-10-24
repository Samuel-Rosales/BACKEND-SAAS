const fs = require('fs');
const { Client } = require('pg');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

// Function to parse CSV lines safely handling quotes
function parseCSV(text) {
    const lines = text.split('\n');
    const records = [];
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        // Parse CSV fields handling quoted strings
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const matches = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            let val = match[1];
            if (val === undefined) break;
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1).replace(/""/g, '"');
            }
            matches.push(val);
            if (regex.lastIndex >= line.length) break;
        }
        records.push(matches);
    }
    return records;
}

async function getDbProducts(url, bizId) {
    const client = new Client({ connectionString: url });
    await client.connect();
    const res = await client.query(`
        SELECT p.id, p.name, p.sku, p."salePrice", p."costPrice", p."currentStock", p."isActive", p."businessId",
               c.name as category_name,
               json_agg(json_build_object('id', pr.id, 'sku', pr.sku, 'barcode', pr."barCode", 'price', pr.price, 'stock', pr.stock)) FILTER (WHERE pr.id IS NOT NULL) as presentations
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        LEFT JOIN "ProductPresentation" pr ON p.id = pr."productId"
        WHERE p."businessId" = $1
        GROUP BY p.id, c.name
    `, [bizId]);
    await client.end();
    return res.rows;
}

module.exports = { parseCSV, getDbProducts, PROD_URL, DEV_URL };
