const http = require('http');

async function testInternalProxy(date) {
    return new Promise((resolve) => {
        const url = `http://localhost:3000/api/volkern/citas/disponibilidad?fecha=${date}&duracion=30`;
        console.log(`\nTesting Internal Proxy for: ${date}`);

        http.get(url, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    if (json.disponibles) {
                        console.log('Slots found via proxy:', json.disponibles.total);
                    } else {
                        console.log('Response:', JSON.stringify(json, null, 2));
                    }
                } catch (e) {
                    console.log('Error parsing JSON:', data.substring(0, 100));
                }
                resolve();
            });
        }).on('error', e => {
            console.log('Error:', e.message);
            console.log('Is the dev server running? (npm run dev)');
            resolve();
        });
    });
}

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dateStr = tomorrow.toISOString().split('T')[0];
testInternalProxy(dateStr);
