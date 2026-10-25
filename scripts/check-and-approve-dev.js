const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

if (!token) {
    console.error('No accessToken found in railway config');
    process.exit(1);
}

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
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function approveDeployment(id) {
    console.log(`>>> Aprobando despliegue pendiente: ${id}...`);
    const approveMutation = `
    mutation Approve($id: String!) {
      deploymentApprove(id: $id)
    }
    `;
    const appRes = await queryGraphQL(approveMutation, { id });
    console.log('Resultado de aprobación:', appRes);
}

async function main() {
    console.log('Consultando últimos despliegues en Railway...');
    const listQuery = `
    query {
      project(id: "bbc1963c-406c-409b-b879-f64a2a10e96b") {
        deployments(first: 50) {
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

    const res = await queryGraphQL(listQuery);
    console.log('Deployments response:', JSON.stringify(res, null, 2));
    const edges = res.data?.project?.deployments?.edges || [];

    for (const edge of edges) {
        const d = edge.node;
        // Only inspect dev environment (41fd86ac-81f5-4c15-9f04-c4f9e311448d)
        if (d.environmentId === '41fd86ac-81f5-4c15-9f04-c4f9e311448d') {
            console.log(`[Dev Deploy] ID: ${d.id} | Status: ${d.status} | Service: ${d.serviceId} | Created: ${d.createdAt}`);

            if (d.status === 'NEEDS_APPROVAL') {
                await approveDeployment(d.id);
            }
        }
    }
}

main().catch(console.error);
