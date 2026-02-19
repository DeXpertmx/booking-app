const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split(/\r?\n/).forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;
        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex > 0) {
            const key = trimmedLine.substring(0, separatorIndex).trim();
            let value = trimmedLine.substring(separatorIndex + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
            process.env[key] = value;
        }
    });
}

const API_KEY = process.env.VOLKERN_API_KEY;
const date = new Date().toISOString().split('T')[0];

async function testAvailability(date, duration = 30) {
    return new Promise((resolve) => {
        const url = new URL(`https://volkern.app/api/citas/disponibilidad?fecha=${date}&duracion=${duration}`);
        const headers = {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        };

        console.log(`\nTesting Availability for: ${date} (${duration} min)`);
        const req = https.request(url, { method: 'GET', headers }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                const json = JSON.parse(data);
                console.log('Slots found:', json.disponibles?.total || 0);
                if (json.disponibles?.slots?.length > 0) {
                    console.log('Slots:', json.disponibles.slots);
                }
                resolve();
            });
        });
        req.on('error', e => { console.log('Error:', e.message); resolve(); });
        req.end();
    });
}

testAvailability(date);
