const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs');

let cookieMap = new Map();

function resetCookies() {
  cookieMap.clear();
}

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
        'Cookie': getCookieString(),
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

async function tryLogin(box, pass) {
  resetCookies();
  const g = await req('/login');
  const tokenMatch = g.body.match(/name="_token"\s+value="([^"]+)"/);
  if (!tokenMatch) return { success: false, reason: 'No CSRF token' };

  const postBody = new URLSearchParams({
    _token: tokenMatch[1],
    security_code: '01597001',
    box_number: box,
    password: pass,
  }).toString();

  const p = await req('/login', 'POST', postBody);
  const loc = p.headers.location || '';

  if (loc.includes('dashboard') || loc.includes('pago-movil')) {
    return { success: true, location: loc };
  }

  const errPage = await req('/login');
  const m = errPage.body.match(/<div class="bg-red-100[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return { success: false, reason: m ? m[0].replace(/<[^>]+>/g, '').trim() : `Status ${p.statusCode}` };
}

async function runValidation(boxUsed) {
  console.log(`\n======================================================`);
  console.log(`¡Sesión logueada con éxito usando Caja ${boxUsed}!`);
  console.log(`======================================================`);

  console.log('1. Accediendo a /pago-movil...');
  const pm = await req('/pago-movil');
  console.log('GET /pago-movil status:', pm.statusCode, 'Location:', pm.headers.location || 'none');

  const formTokenMatch = pm.body.match(/id="form-confirmacion-pago"[^>]*>.*?name="_token"\s+value="([^"]+)"/s) ||
                         pm.body.match(/name="_token"\s+value="([^"]+)"/);

  if (!formTokenMatch) {
    console.log('No se encontró token en /pago-movil. Guardando pm-fail.html');
    fs.writeFileSync('scripts/pm-fail.html', pm.body);
    return false;
  }

  const formToken = formTokenMatch[1];
  console.log('Token obtenido en /pago-movil:', formToken);

  console.log('\n2. Enviando validación de pago del usuario:');
  console.log('   Monto: 13.070,53 Bs | Banco: 0108 | Tel: 04129278135 | Ref: 009984');

  const valBody = new URLSearchParams({
    _token: formToken,
    monto: '13.070,53',
    banco: '0108',
    telefono: '04129278135',
    referencia: '009984',
  }).toString();

  const valRes = await req('/pago-movil', 'POST', valBody);
  console.log('POST /pago-movil status:', valRes.statusCode);
  fs.writeFileSync('scripts/real-val-result.html', valRes.body);
  console.log('Respuesta guardada en scripts/real-val-result.html (longitud: ' + valRes.body.length + ')');

  const body = valRes.body;
  if (
    body.toLowerCase().includes('confirmado') ||
    body.toLowerCase().includes('aprobado') ||
    body.toLowerCase().includes('exitoso') ||
    (body.includes('border-green') && !body.includes('border-red'))
  ) {
    console.log('\n>>> ¡¡¡PAGO CONFIRMADO Y VALIDADO CON ÉXITO POR EL BANCO DEL TESORO!!! <<<');
    return true;
  } else if (body.toLowerCase().includes('no encontrado')) {
    console.log('\n>>> Pago respondido por el banco: NO ENCONTRADO <<<');
    return true;
  } else {
    console.log('\nRespuesta no concluyente:', body.slice(0, 300));
    return false;
  }
}

async function loop() {
  console.log(`[${new Date().toLocaleTimeString()}] Iniciando monitor de Cajas 04 y 03...`);

  for (let i = 0; i < 40; i++) {
    // 1. Probar Caja 04 (Guardian)
    const res04 = await tryLogin('04', '654321');
    console.log(`[${new Date().toLocaleTimeString()}] Intento ${i + 1} - Caja 04:`, res04.success ? '¡CONECTADO!' : res04.reason);
    if (res04.success) {
      const ok = await runValidation('04');
      if (ok) return;
    }

    // 2. Probar Caja 03 (Pericon / Respaldo)
    const res03 = await tryLogin('03', '0000');
    console.log(`[${new Date().toLocaleTimeString()}] Intento ${i + 1} - Caja 03:`, res03.success ? '¡CONECTADO!' : res03.reason);
    if (res03.success) {
      const ok = await runValidation('03');
      if (ok) return;
    }

    await new Promise(r => setTimeout(r, 12000));
  }
}

loop().catch(console.error);
