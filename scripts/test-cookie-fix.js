const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs');

let cookieMap = new Map();

function updateCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  for (const header of setCookieHeaders) {
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

function req(path, method = 'GET', body = null, followRedirects = 5) {
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
        'Cookie': getCookieString(),
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(body);
      options.headers['Referer'] = 'https://tesoropagos.bt.com.ve/pago-movil';
      options.headers['Origin'] = 'https://tesoropagos.bt.com.ve';
    }

    const r = https.request(options, async (res) => {
      let data = '';
      updateCookies(res.headers['set-cookie']);
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        console.log(`[${method} ${p}] -> ${res.statusCode} (Location: ${res.headers.location || 'none'})`);

        if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location && followRedirects > 0) {
          console.log(`  -> Redirigiendo a: ${res.headers.location}`);
          const next = await req(res.headers.location, 'GET', null, followRedirects - 1);
          return resolve(next);
        }

        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function testFullFlow() {
  console.log('--- 1. Cargar /login ---');
  const getLogin = await req('/login');
  const tokenMatch = getLogin.body.match(/name="_token"\s+value="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : null;
  console.log('Token obtenido:', token);

  console.log('\n--- 2. Login POST (Caja 04 o 03) ---');
  const postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  const loginRes = await req('/login', 'POST', postBody);
  console.log('Final landing page status:', loginRes.statusCode);

  console.log('\n--- 3. Acceder a /pago-movil ---');
  const pmRes = await req('/pago-movil');
  console.log('pmRes status:', pmRes.statusCode);

  const formTokenMatch = pmRes.body.match(/id="form-confirmacion-pago"[^>]*>.*?name="_token"\s+value="([^"]+)"/s) ||
                         pmRes.body.match(/name="_token"\s+value="([^"]+)"/);
  console.log('Form token en /pago-movil:', formTokenMatch ? formTokenMatch[1] : 'NO ENCONTRADO');

  if (formTokenMatch) {
    console.log('\n--- 4. Validar Pago del Usuario ---');
    console.log('Validando: 13.070,53 Bs | Banco 0108 | Tel: 04129278135 | Ref: 009984');
    const valBody = new URLSearchParams({
      _token: formTokenMatch[1],
      monto: '13.070,53',
      banco: '0108',
      telefono: '04129278135',
      referencia: '009984',
    }).toString();

    const valRes = await req('/pago-movil', 'POST', valBody);
    console.log('Validation POST status:', valRes.statusCode);
    fs.writeFileSync('scripts/validation-result.html', valRes.body);
    console.log('Guardado en scripts/validation-result.html');

    if (valRes.body.includes('Confirmado') || valRes.body.includes('Aprobado') || valRes.body.includes('Exitoso') || valRes.body.includes('border-green')) {
      console.log('>>> ¡¡¡EXITO TOTAL: PAGO CONFIRMADO POR EL BANCO DEL TESORO!!! <<<');
    } else if (valRes.body.includes('No encontrado') || valRes.body.includes('no encontrado')) {
      console.log('>>> PAGO NO ENCONTRADO (verificar monto/fecha/datos) <<<');
    } else {
      console.log('Snippet respuesta:', valRes.body.slice(0, 500));
    }
  } else {
    fs.writeFileSync('scripts/pm-fail.html', pmRes.body);
    console.log('Guardado fallo en scripts/pm-fail.html');
  }
}

testFullFlow().catch(console.error);
