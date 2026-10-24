const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

const deploymentId = process.argv[2] || 'b6c4a48a-b729-4a23-8070-a4d1078e123c';

console.log(`Aprobando despliegue ${deploymentId}...`);

const payload = JSON.stringify({
    query: `
        mutation Approve($id: String!) {
            deploymentApprove(id: $id)
        }
    `,
    variables: { id: deploymentId }
});

const req = https.request('https://back.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    }
}, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('Approved result:', d));
});

req.on('error', console.error);
req.write(payload);
req.end();
