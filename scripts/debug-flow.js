const https = require('https');
const { URLSearchParams } = require('url');

let cookieMap = new Map();

function updateCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  for (const header of setCookieHeaders) {
    console.log('  [Set-Cookie Header]:', header.split(';')[0]);
    const parts = header.split(';');
    const nameVal = parts[0];
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx !== -1) {
      const key = nameVal.slice(0, eqIdx).trim();
      const val = nameVal.slice(eqIdx + 1).trim();
      cookieMap.set(key, val);
    }
  }
}

function getCookieString() {
  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    let p = path;
    if (p.startsWith('https://tesoropagos.bt.com.ve')) {
      p = p.replace('https://tesoropagos.bt.com.ve', '');
    }

    const cookieStr = getCookieString();
    console.log(`\n>>> Request: ${method} ${p}`);
    console.log(`    Sending Cookie: ${cookieStr}`);

    const options = {
      hostname: 'tesoropagos.bt.com.ve',
      path: p,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cookie': cookieStr,
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
      console.log(`<<< Response: ${res.statusCode} Location: ${res.headers.location || 'none'}`);
      updateCookies(res.headers['set-cookie']);
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function debugFlow() {
  const g = await req('/login');
  const token = g.body.match(/name="_token"\s+value="([^"]+)"/)[1];

  const postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  const p = await req('/login', 'POST', postBody);

  if (p.headers.location) {
    const loc = await req(p.headers.location, 'GET');
    console.log('Location status:', loc.statusCode, 'Location:', loc.headers.location);
  }
}

debugFlow().catch(console.error);
