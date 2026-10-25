const https = require('https');

function checkUrl(url) {
    return new Promise((resolve) => {
        const start = Date.now();
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                resolve({
                    url,
                    statusCode: res.statusCode,
                    durationMs: duration,
                    contentLength: data.length,
                    headers: res.headers,
                    snippet: data.slice(0, 300)
                });
            });
        }).on('error', (err) => {
            resolve({
                url,
                error: err.message
            });
        });
    });
}

async function main() {
    console.log('Verificando servicios de PRODUCCIÓN...');
    const frontRes = await checkUrl('https://guardian.com.ve');
    console.log('Frontend Guard (https://guardian.com.ve):', frontRes.statusCode, `${frontRes.durationMs}ms`);

    const backRes = await checkUrl('https://api.guardian.com.ve');
    console.log('Backend SAAS (https://api.guardian.com.ve):', backRes.statusCode, `${backRes.durationMs}ms`, backRes.snippet.trim());
}

main();
