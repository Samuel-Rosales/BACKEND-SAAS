const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8'));
const token = config.user?.accessToken;

const payload = JSON.stringify({
  query: `query {
    project(id: "bbc1963c-406c-409b-b879-f64a2a10e96b") {
      deployments(first: 5) {
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
  }`
});

for (const host of ['backboard.railway.com', 'backboard.railway.app', 'back.railway.app']) {
  const req = https.request({
    hostname: host,
    path: '/graphql/v2',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log(`[${host}] status:`, res.statusCode);
      try {
        const parsed = JSON.parse(d);
        console.log(`[${host}] data:`, JSON.stringify(parsed).slice(0, 200));
      } catch (e) {
        console.log(`[${host}] raw:`, d.slice(0, 100));
      }
    });
  });
  req.on('error', err => console.error(`[${host}] err:`, err.message));
  req.write(payload);
  req.end();
}
