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
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    const q = `
    query {
      project(id: "bbc1963c-406c-409b-b879-f64a2a10e96b") {
        deployments(first: 8) {
          edges {
            node {
              id
              status
              environmentId
              serviceId
              meta
              createdAt
            }
          }
        }
      }
    }
    `;
    const res = await queryGraphQL(q);
    const edges = res.data?.project?.deployments?.edges || [];
    edges.forEach(e => {
        const d = e.node;
        const svc = d.serviceId === '4fc3d234-30cd-4dee-98a0-4e568dabf8ce' ? 'BACKEND-SAAS' : 'FRONTEND-GUARD';
        const env = d.environmentId === '1ea5bf7b-ef04-44f9-a035-eb114eec25e5' ? 'PROD' : 'DEV';
        const meta = d.meta || {};
        console.log(`[${env}] ${svc} | ID: ${d.id} | ${d.status} | ${d.createdAt} | ${meta.branch} | ${meta.commitHash?.substring(0,7)}: ${meta.commitMessage?.substring(0, 50)}`);
    });
}

run().catch(console.error);
