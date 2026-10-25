const https = require('https');
const { URLSearchParams } = require('url');

let cookies = [];
function updateCookies(newCookies) {
  if (!newCookies) return;
  const cookieMap = new Map();
  for (const c of cookies) {
    const [nameVal] = c.split(';');
    const [k, v] = nameVal.split('=');
    if (k && v !== undefined) cookieMap.set(k.trim(), v.trim());
  }
  for (const c of newCookies) {
    const [nameVal] = c.split(';');
    const [k, v] = nameVal.split('=');
    if (k && v !== undefined) cookieMap.set(k.trim(), v.trim());
  }
  cookies = Array.from(cookieMap.entries()).map(([k, v]) => k + '=' + v);
}

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    let p = path;
    if (p.startsWith('https://tesoropagos.bt.com.ve')) {
      p = p.replace('https://tesoropagos.bt.com.ve', '');
    }
    const options = {
      hostname: 'tesoropagos.bt.com.ve',
      path: p,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cookie': cookies.join('; '),
      },
    };
    if (body) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(body);
      options.headers['Referer'] = 'https://tesoropagos.bt.com.ve/dashboard';
      options.headers['Origin'] = 'https://tesoropagos.bt.com.ve';
    }
    const r = https.request(options, (res) => {
      let data = '';
      updateCookies(res.headers['set-cookie']);
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function testLogout() {
  console.log('Testing logout routes...');
  const res1 = await req('/logout', 'POST', '_token=test');
  console.log('POST /logout:', res1.statusCode, 'Location:', res1.headers.location);

  const res2 = await req('/logout', 'GET');
  console.log('GET /logout:', res2.statusCode, 'Location:', res2.headers.location);

  const res3 = await req('/cerrar-sesion', 'GET');
  console.log('GET /cerrar-sesion:', res3.statusCode, 'Location:', res3.headers.location);
}

testLogout().catch(console.error);
