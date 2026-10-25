const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

function queryGraphQL(query) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ query });
        const req = https.request({
            hostname: 'backboard.railway.com',
            path: '/graphql/v2',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function main() {
    const deployId = process.argv[2] || '531d00cb-86c0-420d-827d-51b4ef90b06c';
    const approveQuery = `
    mutation {
      deploymentApprove(id: "${deployId}")
    }
    `;
    const res = await queryGraphQL(approveQuery);
    console.log('Approve result:', res);
}

main();
