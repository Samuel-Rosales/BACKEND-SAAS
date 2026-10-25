const jwt = require('jsonwebtoken');
const Hashids = require('hashids/cjs');
const http = require('https');

const JWT_SECRET = 'Essofte1E50a9eE1e66298';
const HASHID_SALT = 'GuardianHashIdSalt';
const hashids = new Hashids(HASHID_SALT, 17);

const encodedBiz1 = hashids.encode(1);
console.log('Encoded business 1:', encodedBiz1);

const token = jwt.sign({
  id: 2
}, JWT_SECRET, { expiresIn: '1d' });

const req = http.request({
  hostname: 'api.guardian.com.ve',
  port: 443,
  path: '/api/v1/sales/quotation',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-business-id': encodedBiz1,
    'Content-Type': 'application/json'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Response body:', body);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.end();
