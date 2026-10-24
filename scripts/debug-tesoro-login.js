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
      options.headers['Referer'] = 'https://tesoropagos.bt.com.ve/login';
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

async function run() {
  const g = await req('/login');
  const tokenMatch = g.body.match(/name="_token"\s+value="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : null;
  console.log('Token:', token);
  console.log('Initial cookies:', cookies);

  const postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  const p = await req('/login', 'POST', postBody);
  console.log('Post status:', p.statusCode, 'Location:', p.headers.location);
  console.log('Post cookies:', cookies);

  const follow = await req(p.headers.location || '/dashboard');
  console.log('Follow status:', follow.statusCode);
  
  // Guardar HTML del follow para inspeccionar
  const fs = require('fs');
  fs.writeFileSync('scripts/login-response.html', follow.body);
  console.log('Guardado en scripts/login-response.html');

  // Buscar mensajes
  const matches = follow.body.match(/class="[^"]*(alert|invalid|error|feedback|danger|warning)[^"]*"[^>]*>([\s\S]*?)<\/(div|span|p)>/gi);
  console.log('Matches:', matches);

  const textAlerts = follow.body.match(/<div class="alert[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
  console.log('Div alerts:', textAlerts);
}
run();
