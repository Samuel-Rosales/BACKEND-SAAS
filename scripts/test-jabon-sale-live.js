const jwt = require('jsonwebtoken');
const Hashids = require('hashids/cjs');
const https = require('https');

const JWT_SECRET = 'Essofte1E50a9eE1e66298';
const HASHID_SALT = 'GuardianHashIdSalt';
const hashids = new Hashids(HASHID_SALT, 17);
const encodedBiz = hashids.encode(46); // Business 46 !

// Let's find user for business 46
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
    console.log('Testing: Venta de jabón en DEV para Business 46...');
    const r = await askAi('Véndeme 1 jabón en efectivo');
    console.log('Status:', r.status);
    console.log('Message:\n', r.body?.message);
    if (r.body?.actions) {
        console.log('Actions:\n', JSON.stringify(r.body.actions, null, 2));
    }
}

run().catch(console.error);
