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
    console.log(`>>> Aprobando despliegue de PRODUCCIÓN pendiente: ${id}...`);
    const approveMutation = `
    mutation Approve($id: String!) {
      deploymentApprove(id: $id)
    }
    `;
    const appRes = await queryGraphQL(approveMutation, { id });
    console.log('Resultado de aprobación:', JSON.stringify(appRes));
}

async function checkStatus() {
    const listQuery = `
    query {
      project(id: "bbc1963c-406c-409b-b879-f64a2a10e96b") {
        deployments(first: 20) {
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

    const prodDeployments = edges
        .map(e => e.node)
        .filter(d => d.environmentId === '1ea5bf7b-ef04-44f9-a035-eb114eec25e5');

    return prodDeployments;
}

async function loop() {
    console.log('Iniciando monitoreo de despliegues de PRODUCCIÓN v4.8.0...');
    const start = Date.now();
    const targetDeployIds = ['4341144d-2143-46b4-b94f-2d681f272c48', 'faaaf416-12af-41bf-8f9a-da0da4cf12bd'];

    while (Date.now() - start < 300000) { // max 5 min
        const deploys = await checkStatus();
        let allSuccess = true;
        let anyFailed = false;

        for (const targetId of targetDeployIds) {
            const d = deploys.find(dep => dep.id === targetId);
            if (!d) {
                console.log(`Despliegue ${targetId} no encontrado aún.`);
                allSuccess = false;
                continue;
            }

            console.log(`[PROD Monitor] ID: ${d.id} | Service: ${d.serviceId === 'b6d1967a-2465-4afb-98b0-929338ff5753' ? 'FRONTEND' : 'BACKEND'} | Status: ${d.status}`);

            if (d.status === 'NEEDS_APPROVAL') {
                await approveDeployment(d.id);
                allSuccess = false;
            } else if (d.status === 'CRASHED' || d.status === 'FAILED') {
                anyFailed = true;
            } else if (d.status !== 'SUCCESS') {
                allSuccess = false;
            }
        }

        if (anyFailed) {
            console.error('Uno de los despliegues de producción falló.');
            process.exit(1);
        }

        if (allSuccess) {
            console.log('¡TODOS LOS DESPLIEGUES DE PRODUCCIÓN COMPLETADOS CON ÉXITO (SUCCESS)!');
            process.exit(0);
        }

        await new Promise(r => setTimeout(r, 10000));
    }
    console.log('Tiempo de espera agotado.');
}

loop().catch(console.error);
