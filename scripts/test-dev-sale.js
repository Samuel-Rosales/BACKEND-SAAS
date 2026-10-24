const jwt = require('jsonwebtoken');
const Hashids = require('hashids/cjs');
const https = require('https');

const JWT_SECRET = 'Essofte1E50a9eE1e66298';
const HASHID_SALT = 'GuardianHashIdSalt';
const hashids = new Hashids(HASHID_SALT, 17);
const encodedBiz = hashids.encode(1);

const token = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: '1d' });

function req(path) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: 'back.guardian.com.ve',
      path: '/api/v1' + path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'x-business-id': encodedBiz,
        'Content-Type': 'application/json'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function run() {
  console.log('Testing /sales/sale on DEV for business 1 (' + encodedBiz + ')...');
  const res = await req('/sales/sale?page=1&limit=5000');
  console.log('Status:', res.status);
  console.log('Length:', res.data.length);
  if (res.status !== 200) {
    console.log('Body:', res.data);
  } else {
    const parsed = JSON.parse(res.data);
    console.log('Parsed data count:', parsed.data?.length);
    console.log('Sample item:', parsed.data?.[0]);
  }
}

run().catch(console.error);
