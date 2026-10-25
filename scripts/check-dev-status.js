const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

function query(q) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ query: q });
        const req = https.request({
            hostname: 'backboard.railway.com',
            path: '/graphql/v2',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    const listQuery = `
    query {
      project(id: "bbc1963c-406c-409b-b879-f64a2a10e96b") {
        deployments(first: 25) {
          edges {
            node {
              id
              status
              environmentId
              serviceId
              createdAt
            }
          }
        }
      }
    }
    `;

    const res = await query(listQuery);
    if (res.errors) console.error('GraphQL errors:', res.errors);
    const edges = res.data?.project?.deployments?.edges || [];
    const devDeploys = edges
        .map(e => e.node)
        .filter(d => d.environmentId === '41fd86ac-81f5-4c15-9f04-c4f9e311448d')
        .slice(0, 4);

    for (const d of devDeploys) {
        const svc = d.serviceId === '4fc3d234-30cd-4dee-98a0-4e568dabf8ce' ? 'BACKEND-SAAS' : 'FRONTEND-GUARD';
        console.log(`- ${svc}: [${d.status}] (${d.id}) at ${d.createdAt}`);
    }
}

run().catch(console.error);
