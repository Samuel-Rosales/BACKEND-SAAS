const https = require('https');
const { URLSearchParams } = require('url');

let cookies = [];

function req(path, method = 'GET', body = null, currentCookies = []) {
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
        'Cookie': currentCookies.join('; '),
      },
    };
    if (body) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(body);
      options.headers['Referer'] = 'https://tesoropagos.bt.com.ve/login';
      options.headers['Origin'] = 'https://tesoropagos.bt.com.ve';
    }
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        setCookies: res.headers['set-cookie'] || [],
        body: data
      }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function debugCookies() {
  const g = await req('/login');
  console.log('GET /login set-cookies:');
  console.log(g.setCookies);
  const token = g.body.match(/name="_token"\s+value="([^"]+)"/)[1];

  // Extraer nombres y valores
  let jar = g.setCookies.map(c => c.split(';')[0]);

  console.log('\nPOST /login with cookies:', jar);
  const postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  const p = await req('/login', 'POST', postBody, jar);
  console.log('POST /login status:', p.statusCode, 'Location:', p.headers.location);
  console.log('POST /login set-cookies:');
  console.log(p.setCookies);

  // Fusionar cookies nuevas
  const cookieMap = new Map();
  jar.forEach(c => {
    const [k, v] = c.split('=');
    cookieMap.set(k.trim(), v.trim());
  });
  p.setCookies.forEach(sc => {
    const [nameVal] = sc.split(';');
    const [k, v] = nameVal.split('=');
    cookieMap.set(k.trim(), v.trim());
  });

  const mergedCookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);
  console.log('\nMerged cookies for dashboard:', mergedCookies);

  const dash = await req(p.headers.location, 'GET', null, mergedCookies);
  console.log('Dashboard status:', dash.statusCode, 'Location:', dash.headers.location);
  console.log('Dashboard set-cookies:', dash.setCookies);
  console.log('Dashboard body preview:', dash.body.slice(0, 300));
}

debugCookies().catch(console.error);
