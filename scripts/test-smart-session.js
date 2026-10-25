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
      options.headers['Referer'] = 'https://tesoropagos.bt.com.ve/pago-movil';
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

async function smartValidate() {
  console.log('--- Probando inicio de sesión en Caja 04 ---');
  const g = await req('/login');
  const token = g.body.match(/name="_token"\s+value="([^"]+)"/)[1];

  const p = await req('/login', 'POST', new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString());

  console.log('Login POST:', p.statusCode, 'Location:', p.headers.location);

  if (p.headers.location && p.headers.location.includes('dashboard')) {
    console.log('-> Login al dashboard exitoso!');
  } else {
    console.log('-> Login location:', p.headers.location);
    if (p.headers.location && p.headers.location.includes('login')) {
      const follow = await req('/login');
      if (follow.body.includes('La caja ya tiene una sesión activa')) {
        console.log('-> La caja tiene sesión activa en el banco. Esperando expiración o probando acceso...');
      }
    }
  }

  console.log('\n--- Probando GET /pago-movil ---');
  const pm = await req('/pago-movil');
  console.log('pago-movil status:', pm.statusCode, 'Location:', pm.headers.location);
  
  const tokenMatch = pm.body.match(/id="form-confirmacion-pago"[^>]*>.*?name="_token"\s+value="([^"]+)"/s) ||
                     pm.body.match(/name="_token"\s+value="([^"]+)"/);
  console.log('Token en /pago-movil:', tokenMatch ? tokenMatch[1] : 'NO ENCONTRADO');

  if (tokenMatch) {
    console.log('\n--- Probando POST validación con el pago del usuario ---');
    const valBody = new URLSearchParams({
      _token: tokenMatch[1],
      monto: '13.070,53',
      banco: '0108',
      telefono: '04129278135',
      referencia: '009984',
    }).toString();

    const valRes = await req('/pago-movil', 'POST', valBody);
    console.log('Validación status:', valRes.statusCode);
    const fs = require('fs');
    fs.writeFileSync('scripts/user-payment-result.html', valRes.body);
    console.log('Resultado guardado en scripts/user-payment-result.html');

    // Analizar resultado
    if (valRes.body.includes('Confirmado') || valRes.body.includes('Aprobado') || valRes.body.includes('Exitoso')) {
      console.log('-> ¡¡¡PAGO CONFIRMADO CON ÉXITO EN EL BANCO DEL TESORO!!!');
    } else if (valRes.body.includes('No encontrado')) {
      console.log('-> Pago no encontrado');
    } else {
      console.log('-> Respuesta:', valRes.body.slice(0, 400));
    }
  }
}

smartValidate().catch(console.error);
