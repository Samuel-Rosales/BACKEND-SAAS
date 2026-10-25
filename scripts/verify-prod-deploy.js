const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

const payload = JSON.stringify({
  query: `query {
    project(id: "bbc1963c-406c-409b-b879-f64a2a10e96b") {
      deployments(first: 8) {
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
  }`
});

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
  res.on('end', () => {
    const list = JSON.parse(d).data?.project?.deployments?.edges?.map(e => e.node) || [];
    const prod = list.filter(x => x.environmentId === '1ea5bf7b-ef04-44f9-a035-eb114eec25e5');
    console.log('Production Deployments:');
    prod.forEach(p => {
      const svc = p.serviceId === '4fc3d234-30cd-4dee-98a0-4e568dabf8ce' ? 'BACKEND-SAAS' : 'FRONTEND-GUARD';
      const commit = p.meta?.commitMessage || p.meta?.commitAuthor || 'N/A';
      console.log(` - ${svc} [${p.status}] ID: ${p.id} | Commit: "${commit}" | Created: ${p.createdAt}`);
    });
  });
});
req.write(payload);
req.end();
