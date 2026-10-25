const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

const PROD_ENV_ID = '1ea5bf7b-ef04-44f9-a035-eb114eec25e5';

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

async function approveDeployment(id) {
    console.log(`>>> Aprobando despliegue en Producción: ${id}...`);
    const approveMutation = `
    mutation Approve($id: String!) {
      deploymentApprove(id: $id)
    }
    `;
    const appRes = await queryGraphQL(approveMutation, { id });
    console.log('Resultado de aprobación PROD:', appRes);
}

async function checkStatus() {
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
              createdAt
            }
          }
        }
      }
    }
    `;

    const res = await queryGraphQL(listQuery);
    const edges = res.data?.project?.deployments?.edges || [];
    const prodDeploys = edges
        .map(e => e.node)
        .filter(d => d.environmentId === PROD_ENV_ID)
        .slice(0, 2);

    console.log(new Date().toLocaleTimeString(), 'PROD Deployments:');
    let allSuccess = true;
    for (const d of prodDeploys) {
        const svc = d.serviceId === '4fc3d234-30cd-4dee-98a0-4e568dabf8ce' ? 'BACKEND-SAAS' : 'FRONTEND-GUARD';
        console.log(`  - ${svc}: [${d.status}] (${d.id})`);

        if (d.status === 'NEEDS_APPROVAL') {
            await approveDeployment(d.id);
            allSuccess = false;
        } else if (d.status !== 'SUCCESS') {
            allSuccess = false;
        }
    }
    return allSuccess && prodDeploys.length === 2;
}

async function loop() {
    for (let i = 0; i < 40; i++) {
        const done = await checkStatus();
        if (done) {
            console.log('\n>>> ¡TODOS LOS SERVICIOS EN EL SERVIDOR PRINCIPAL (PRODUCCIÓN) ESTÁN EN SUCCESS! <<<');
            process.exit(0);
        }
        await new Promise(r => setTimeout(r, 10000));
    }
    console.log('Timeout esperando despliegues de Producción.');
    process.exit(1);
}

loop().catch(console.error);
