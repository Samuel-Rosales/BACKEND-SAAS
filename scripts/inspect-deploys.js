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

async function main() {
    const listQuery = `
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
    const res = await queryGraphQL(listQuery);
    const edges = res.data?.project?.deployments?.edges || [];
    const devDeploys = edges
        .map(e => e.node)
        .filter(d => d.environmentId === '41fd86ac-81f5-4c15-9f04-c4f9e311448d')
        .map(d => ({
            id: d.id,
            status: d.status,
            service: d.serviceId === '4fc3d234-30cd-4dee-98a0-4e568dabf8ce' ? 'BACKEND' : 'FRONTEND',
            commitMessage: d.meta?.commitMessage,
            commitHash: d.meta?.commitHash,
            createdAt: d.createdAt
        }));
    console.table(devDeploys);
}

main().catch(console.error);
