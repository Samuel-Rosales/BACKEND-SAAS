const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function check() {
  try {
    for (const path of ['/', '/login']) {
      const res = await get('https://guardian.com.ve' + path);
      console.log(`Path ${path} status:`, res.status);
      const matches = res.body.match(/_astro\/[^"']+\.js/g) || [];
      console.log(`Scripts in ${path}:`, matches.slice(0, 5));
    }
  } catch (err) {
    console.error('Error checking prod:', err.message);
  }
}

check();
