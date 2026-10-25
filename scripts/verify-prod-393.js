const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function verify() {
  const login = await get('https://guardian.com.ve/login');
  const scripts = login.body.match(/_astro\/[^"']+\.js/g) || [];
  console.log('Login scripts:', scripts);
  
  // Test if changelog page or dashboard redirects or serves
  const changelog = await get('https://guardian.com.ve/changelog');
  console.log('Changelog status:', changelog.status);
  const chScripts = changelog.body.match(/_astro\/[^"']+\.js/g) || [];
  console.log('Changelog scripts:', chScripts);

  for (const s of chScripts) {
    const sc = await get('https://guardian.com.ve/' + s);
    const m = sc.body.match(/3\.9\.[0-9]+/g);
    if (m) console.log(s, 'matches:', [...new Set(m)]);
  }
}

verify();
