const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/VOLKERN_API_KEY=(.+)/);
const baseUrlMatch = envContent.match(/VOLKERN_BASE_URL=(.+)/);

if (!apiKeyMatch || !baseUrlMatch) {
    console.error('Missing .env.local variables');
    process.exit(1);
}

const API_KEY = apiKeyMatch[1].trim().replace(/^["']|["']$/g, '');
const BASE_URL = baseUrlMatch[1].trim().replace(/\/$/, '');

async function request(endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            method: 'GET',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function checkDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    const duracion = 30;
    const timezone = 'Europe/Madrid';

    console.log(`\nChecking availability for ${dateStr} (${d.toDateString()})...`);
    const endpoint = `/citas/disponibilidad?fecha=${dateStr}&duracion=${duracion}&timezone=${timezone}`;

    try {
        const res = await request(endpoint);
        if (res.data && res.data.horarioLaboral) {
            console.log(`Dia Activo: ${res.data.diaActivo}`);
            if (res.data.disponibles) {
                console.log(`Slots Found: ${res.data.disponibles.slots ? res.data.disponibles.slots.length : 0}`);
            }
            if (res.data.horarioLaboral.resumen) {
                console.log(`Horario Resumen: ${res.data.horarioLaboral.resumen}`);
            }
        } else {
            console.log('Response:', JSON.stringify(res.data).substring(0, 150));
        }
    } catch (err) {
        console.error('Request failed:', err.message);
    }
}

async function run() {
    await checkDate(0); // Today (Should be empty if late)
    await checkDate(1); // Tomorrow
}

run();
