const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

function queryGraphQL(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ query, variables });
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
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function main() {
    const q = `
    query {
      deployments(input: { projectId: "bbc1963c-406c-409b-b879-f64a2a10e96b", environmentId: "41fd86ac-81f5-4c15-9f04-c4f9e311448d" }, first: 10) {
        edges {
          node {
            id
            status
            environmentId
            serviceId
            createdAt
            meta
          }
        }
      }
    }
    `;
    const res = await queryGraphQL(q);
    console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
