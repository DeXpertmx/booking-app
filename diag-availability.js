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
                try {
                    const json = JSON.parse(data);
                    console.log('Response Keys:', Object.keys(json));
                    if (json.disponibles) {
                        console.log('Slots found:', json.disponibles.total);
                        console.log('First 3 slots:', json.disponibles.slots.slice(0, 3));
                    } else if (json.error) {
                        console.log('Error from API:', json.error);
                    } else {
                        console.log('Full Response:', JSON.stringify(json, null, 2));
                    }
                } catch (e) {
                    console.log('Raw Response (non-JSON):', data.substring(0, 500));
                }
                resolve();
            });
        });
        req.on('error', e => { console.log('Error:', e.message); resolve(); });
        req.end();
    });
}

async function run() {
    const today = new Date();
    // Test for tomorrow and next 2 days
    for (let i = 1; i <= 3; i++) {
        const testDate = new Date(today);
        testDate.setDate(today.getDate() + i);
        const dateStr = testDate.toISOString().split('T')[0];
        await testAvailability(dateStr);
    }
}
run();
