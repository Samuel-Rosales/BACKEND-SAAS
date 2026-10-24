const https = require('https');
const { URLSearchParams } = require('url');

async function testCaja04() {
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

  console.log('1. GET /login');
  const g = await req('/login');
  const tokenMatch = g.body.match(/name="_token"\s+value="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : null;

  console.log('2. POST /login Caja 04');
  const postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  const p = await req('/login', 'POST', postBody);
  console.log('Login POST:', p.statusCode, 'Location:', p.headers.location);

  console.log('3. GET', p.headers.location);
  const dash = await req(p.headers.location);
  console.log('Dashboard GET:', dash.statusCode);

  console.log('4. GET /pago-movil');
  const pm = await req('/pago-movil');
  console.log('pago-movil GET:', pm.statusCode, 'Length:', pm.body.length);

  const formTokenMatch = pm.body.match(/id="form-confirmacion-pago"[^>]*>.*?name="_token"\s+value="([^"]+)"/s) ||
                         pm.body.match(/name="_token"\s+value="([^"]+)"/);
  console.log('PM Token:', formTokenMatch ? formTokenMatch[1] : 'NO ENCONTRADO');

  // Let's test a validation with user's data from logs:
  // From logs: Monto=13.070,53 Bs, Banco=0108, Teléfono=04129278135, Ref=009984 (or similar)
  if (formTokenMatch) {
    console.log('5. POST /pago-movil validation');
    const valBody = new URLSearchParams({
      _token: formTokenMatch[1],
      monto: '13.070,53',
      banco: '0108',
      telefono: '04129278135',
      referencia: '009984',
    }).toString();

    const valRes = await req('/pago-movil', 'POST', valBody);
    console.log('valRes statusCode:', valRes.statusCode, 'Length:', valRes.body.length);
    console.log('Snippet of valRes:', valRes.body.slice(0, 500));
    const fs = require('fs');
    fs.writeFileSync('scripts/pm-val-result.html', valRes.body);
    console.log('Guardado en scripts/pm-val-result.html');
  }
}

testCaja04().catch(console.error);
