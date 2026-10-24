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

async function approveDeployment(id) {
    console.log(`>>> Aprobando despliegue en DEV: ${id}...`);
    const approveMutation = `
    mutation Approve($id: String!) {
      deploymentApprove(id: $id)
    }
    `;
    const appRes = await queryGraphQL(approveMutation, { id });
    console.log('Resultado de aprobación DEV:', appRes);
}

async function checkStatus() {
    const listQuery = `
    query {
      project(id: "bbc1963c-406c-409b-b879-f64a2a10e96b") {
        deployments(first: 6) {
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
    const allDev = edges
        .map(e => e.node)
        .filter(d => d.environmentId === '41fd86ac-81f5-4c15-9f04-c4f9e311448d');

    // Tomar solo el despliegue más reciente por servicio
    const latestByService = new Map();
    for (const d of allDev) {
        if (!latestByService.has(d.serviceId)) {
            latestByService.set(d.serviceId, d);
        }
    }

    const devDeploys = Array.from(latestByService.values());

    console.log(new Date().toLocaleTimeString(), 'Dev Deployments (Más recientes):');
    let allSuccess = true;
    for (const d of devDeploys) {
        const svc = d.serviceId === '4fc3d234-30cd-4dee-98a0-4e568dabf8ce' ? 'BACKEND-SAAS' : 'FRONTEND-GUARD';
        console.log(`  - ${svc}: [${d.status}] (${d.id})`);
        if (d.status === 'NEEDS_APPROVAL') {
            await approveDeployment(d.id);
            allSuccess = false;
        } else if (d.status !== 'SUCCESS') {
            allSuccess = false;
        }
    }
    return allSuccess && devDeploys.length > 0;
}

async function loop() {
    for (let i = 0; i < 30; i++) {
        const done = await checkStatus();
        if (done) {
            console.log('\n>>> ¡Ambos servicios en DEV están desplegados y en estado SUCCESS! <<<');
            process.exit(0);
        }
        await new Promise(r => setTimeout(r, 10000));
    }
    console.log('Timeout esperando despliegues.');
    process.exit(1);
}

loop().catch(console.error);
