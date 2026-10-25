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
  cookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);
}

function req(path, method = 'GET', body = null, followRedirects = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'tesoropagos.bt.com.ve',
      path,
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
      options.headers['Referer'] = `https://tesoropagos.bt.com.ve${path}`;
      options.headers['Origin'] = 'https://tesoropagos.bt.com.ve';
    }

    const r = https.request(options, async (res) => {
      let data = '';
      updateCookies(res.headers['set-cookie']);
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        console.log(`[${method} ${path}] => ${res.statusCode} (Location: ${res.headers.location || 'none'}, Cookies: ${cookies.length})`);
        
        if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location && followRedirects > 0) {
          let nextPath = res.headers.location;
          if (nextPath.startsWith('https://tesoropagos.bt.com.ve')) {
            nextPath = nextPath.replace('https://tesoropagos.bt.com.ve', '');
          }
          console.log(`  -> Siguiendo redirect a: ${nextPath}`);
          const nextRes = await req(nextPath, 'GET', null, followRedirects - 1);
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

async function test() {
  console.log('--- 1. GET /login ---');
  const loginGet = await req('/login');
  const tokenMatch = loginGet.body.match(/name="_token"\s+value="([^"]+)"/);
  console.log('CSRF token:', tokenMatch ? tokenMatch[1] : 'NO ENCONTRADO');

  console.log('\n--- 2. POST /login ---');
  const postBody = new URLSearchParams({
    _token: tokenMatch[1],
    security_code: '01597001',
    box_number: '04',
    password: '654321',
  }).toString();

  const loginPost = await req('/login', 'POST', postBody);
  console.log('Login post result length:', loginPost.body.length);

  console.log('\n--- 3. GET /pago-movil ---');
  const pmGet = await req('/pago-movil');
  console.log('pmGet status:', pmGet.statusCode);
  console.log('pmGet body snippet:', pmGet.body.slice(0, 300));
  
  const formTokenMatch = pmGet.body.match(/id="form-confirmacion-pago"[^>]*>.*?name="_token"\s+value="([^"]+)"/s) ||
                         pmGet.body.match(/name="_token"\s+value="([^"]+)"/);
  console.log('PM Form Token:', formTokenMatch ? formTokenMatch[1] : 'NO ENCONTRADO');

  const metaMatch = pmGet.body.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
  console.log('PM Meta Token:', metaMatch ? metaMatch[1] : 'NO ENCONTRADO');
}

test().catch(console.error);
