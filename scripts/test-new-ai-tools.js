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
            localDate: '2026-10-20'
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
    console.log('Testing: Resumen de apertura matutino...');
    const r1 = await askAi('Dame el resumen de apertura matutino de hoy.');
    console.log('Status r1:', r1.status);
    console.log('Message r1:\n', r1.body?.message);

    console.log('\nTesting: Abono a cliente por comando de voz...');
    const r2 = await askAi('Abónale 20 dólares a Pedro que pagó.');
    console.log('Status r2:', r2.status);
    console.log('Message r2:\n', r2.body?.message);
    if (r2.body?.actions) {
        console.log('Actions r2:', JSON.stringify(r2.body.actions, null, 2));
    }
}

run().catch(console.error);
