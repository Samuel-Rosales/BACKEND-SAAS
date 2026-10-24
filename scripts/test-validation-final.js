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

function req(path, method = 'GET', body = null, referer = null, followRedirects = 5) {
  return new Promise((resolve, reject) => {
    let p = path;
    if (p.startsWith('https://tesoropagos.bt.com.ve')) {
      p = p.replace('https://tesoropagos.bt.com.ve', '');
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Cookie': getCookieString(),
    };

    if (referer) headers['Referer'] = referer;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
      headers['Origin'] = 'https://tesoropagos.bt.com.ve';
      if (!referer) headers['Referer'] = `https://tesoropagos.bt.com.ve${p}`;
    }

    const r = https.request({
      hostname: 'tesoropagos.bt.com.ve',
      path: p,
      method,
      headers,
    }, async (res) => {
      let data = '';
      updateCookies(res.headers['set-cookie']);
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        console.log(`[${method} ${p}] => ${res.statusCode} (Location: ${res.headers.location || 'none'})`);

        if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location && followRedirects > 0) {
          const loc = res.headers.location;
          console.log(`  -> Auto-siguiendo redirección a: ${loc}`);
          const nextRes = await req(loc, 'GET', null, `https://tesoropagos.bt.com.ve${p}`, followRedirects - 1);
          return resolve(nextRes);
        }

        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function run() {
  console.log('--- 1. Cargar /login para CSRF token ---');
  const g = await req('/login');
  const token = g.body.match(/name="_token"\s+value="([^"]+)"/)[1];

  console.log('\n--- 2. POST /login con Caja 04 ---');
  let postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  let p = await req('/login', 'POST', postBody, 'https://tesoropagos.bt.com.ve/login');

  if (p.body.includes('La caja ya tiene una sesión activa') || p.body.includes('CAJA CON SESION ABIERTA')) {
    console.log('Caja 04 ocupada, probando Caja 03 de respaldo...');
    const g2 = await req('/login');
    const token2 = g2.body.match(/name="_token"\s+value="([^"]+)"/)[1];
    postBody = new URLSearchParams({
      _token: token2,
      security_code: '01597001',
      box_number: '03',
      password: '0000',
    }).toString();
    p = await req('/login', 'POST', postBody, 'https://tesoropagos.bt.com.ve/login');
  }

  console.log('\n--- 3. Acceder a /pago-movil ---');
  const pm = await req('/pago-movil', 'GET', null, 'https://tesoropagos.bt.com.ve/dashboard');
  fs.writeFileSync('scripts/pm-page.html', pm.body);
  console.log('pm-page.html guardada (longitud: ' + pm.body.length + ')');

  const formTokenMatch = pm.body.match(/id="form-confirmacion-pago"[^>]*>.*?name="_token"\s+value="([^"]+)"/s) ||
                         pm.body.match(/name="_token"\s+value="([^"]+)"/);
  console.log('Form token en /pago-movil:', formTokenMatch ? formTokenMatch[1] : 'NO ENCONTRADO');

  if (!formTokenMatch) {
    console.error('No se pudo encontrar token en /pago-movil');
    return;
  }

  console.log('\n--- 4. POST /pago-movil con los datos del pago real del usuario ---');
  console.log('Monto: 13.070,53 Bs | Banco: 0108 | Tel: 04129278135 | Ref: 009984');

  const valData = new URLSearchParams({
    _token: formTokenMatch[1],
    monto: '13.070,53',
    banco: '0108',
    telefono: '04129278135',
    referencia: '009984',
  }).toString();

  const valRes = await req('/pago-movil', 'POST', valData, 'https://tesoropagos.bt.com.ve/pago-movil');
  fs.writeFileSync('scripts/final-val-page.html', valRes.body);
  console.log('final-val-page.html guardada (longitud: ' + valRes.body.length + ')');

  // Buscar mensajes de alerta o resultado
  const alerts = valRes.body.match(/<div class="[^"]*(alert|border-green|border-red|text-green|text-red)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
  console.log('\nAlertas encontradas:');
  if (alerts) {
    alerts.forEach(a => console.log(' ->', a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  } else {
    console.log('No direct alert divs found, preview:', valRes.body.slice(0, 400));
  }

  if (
    valRes.body.toLowerCase().includes('confirmado') ||
    valRes.body.toLowerCase().includes('aprobado') ||
    valRes.body.toLowerCase().includes('exitoso') ||
    (valRes.body.includes('border-green') && !valRes.body.includes('border-red'))
  ) {
    console.log('\n======================================================');
    console.log('>>> ¡¡¡PAGO CONFIRMADO CON ÉXITO EN EL BANCO DEL TESORO!!! <<<');
    console.log('======================================================');
  } else if (valRes.body.toLowerCase().includes('no encontrado')) {
    console.log('\n>>> PAGO NO ENCONTRADO EN EL BANCO (Revisar fecha/monto) <<<');
  }
}

run().catch(console.error);
