const https = require('https');
const { URLSearchParams } = require('url');

let cookies = [];
function update(newC) {
  if (!newC) return;
  newC.forEach(c => {
    const [nv] = c.split(';');
    const [k, v] = nv.split('=');
    cookies = cookies.filter(item => !item.startsWith(k + '='));
    cookies.push(k + '=' + v);
  });
}

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    let p = path.replace('https://tesoropagos.bt.com.ve', '');
    const r = https.request({
      hostname: 'tesoropagos.bt.com.ve',
      path: p,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cookie': cookies.join('; '),
        ...(body ? {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Referer': 'https://tesoropagos.bt.com.ve/login',
          'Origin': 'https://tesoropagos.bt.com.ve'
        } : {})
      }
    }, res => {
      let data = '';
      update(res.headers['set-cookie']);
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function test() {
  const g = await req('/login');
  console.log('1. GET /login cookies:', cookies.map(c => c.split('=')[0]));
  const token = g.body.match(/name="_token"\s+value="([^"]+)"/)[1];
  console.log('Token:', token);

  const postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  const p = await req('/login', 'POST', postBody);
  console.log('2. POST /login status:', p.status, 'Location:', p.headers.location);
  console.log('2. Cookies after login:', cookies.map(c => c.split('=')[0]));

  const target = p.headers.location || '/pago-movil';
  const follow = await req(target);
  console.log('3. Follow status:', follow.status, 'Location:', follow.headers.location);
  console.log('3. Follow alerts:', follow.body.match(/<div class="[^"]*alert[^"]*"[^>]*>([\s\S]*?)<\/div>/gi));
  console.log('3. Cookies after follow:', cookies.map(c => c.split('=')[0]));

  const pm = await req('/pago-movil');
  console.log('4. GET /pago-movil status:', pm.status, 'Location:', pm.headers.location);
}
test().catch(console.error);
