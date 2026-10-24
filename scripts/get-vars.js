const fs = require('fs');
const https = require('https');
const token = JSON.parse(fs.readFileSync('C:\\Users\\e\\.railway\\config.json', 'utf8')).user?.accessToken;
const query = `query { variables(projectId: "bbc1963c-406c-409b-b879-f64a2a10e96b", environmentId: "1ea5bf7b-ef04-44f9-a035-eb114eec25e5", serviceId: "4fc3d234-30cd-4dee-98a0-4e568dabf8ce") }`;
const req = https.request('https://back.railway.app/graphql/v2', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const json = JSON.parse(d);
    const vars = json.data?.variables || {};
    const filtered = Object.keys(vars).filter(k => !k.includes('DATABASE_URL')).reduce((acc, k) => { acc[k] = vars[k]; return acc; }, {});
    console.log(JSON.stringify(filtered, null, 2));
  });
});
req.write(JSON.stringify({ query }));
req.end();
