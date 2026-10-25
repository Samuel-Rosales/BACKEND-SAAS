const jwt = require('jsonwebtoken');
const Hashids = require('hashids/cjs');
const https = require('https');

const JWT_SECRET = 'Essofte1E50a9eE1e66298';
const HASHID_SALT = 'GuardianHashIdSalt';
const hashids = new Hashids(HASHID_SALT, 17);
const encodedBiz = hashids.encode(1);

const token = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: '1d' });

function askAi(question) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            message: question,
            history: [],
            tzOffset: 240,
            localDate: '2026-10-17'
        });

        const req = https.request({
            hostname: 'back.guardian.com.ve',
            path: '/api/v1/ai/chat',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-business-id': encodedBiz,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    console.log('\n--- PREGUNTA ESPONTÁNEA 1: MEJOR CLIENTE ---');
    const r1 = await askAi('Oye, ¿quién es el cliente que más nos compra aquí?');
    console.log('Status:', r1.status);
    console.log(r1.body?.message);

    console.log('\n--- PREGUNTA ESPONTÁNEA 2: ESTADO DE CAJAS ---');
    const r2 = await askAi('¿Cómo están las cajas ahorita en la tienda, están abiertas?');
    console.log('Status:', r2.status);
    console.log(r2.body?.message);

    console.log('\n--- PREGUNTA ESPONTÁNEA 3: COMPRAS A PROVEEDORES ---');
    const r3 = await askAi('¿Qué le hemos comprado a los proveedores últimamente y cuánto debemos?');
    console.log('Status:', r3.status);
    console.log(r3.body?.message);
}

run().catch(console.error);
