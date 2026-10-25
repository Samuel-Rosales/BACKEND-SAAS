const https = require('https');

https.get('https://guardian.com.ve', res => {
  console.log('Production URL: https://guardian.com.ve - Status:', res.statusCode);
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
    console.log('Found scripts:', scripts.length);
    let checked = 0;
    scripts.forEach(s => {
      const scriptUrl = s.startsWith('http') ? s : 'https://guardian.com.ve' + s;
      https.get(scriptUrl, sres => {
        let js = '';
        sres.on('data', c => js += c);
        sres.on('end', () => {
          if (js.includes('4.4.9')) {
            console.log('>>> VERIFIED: Found version 4.4.9 in production bundle:', scriptUrl);
          }
          checked++;
          if (checked === scripts.length) console.log('Bundle inspection complete.');
        });
      });
    });
  });
}).on('error', e => console.error('Error:', e.message));
