const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/VOLKERN_API_KEY=(.+)/);
const baseUrlMatch = envContent.match(/VOLKERN_BASE_URL=(.+)/);

if (!apiKeyMatch) process.exit(1);

const API_KEY = apiKeyMatch[1].trim().replace(/^["']|["']$/g, '');
const BASE_URL = baseUrlMatch ? baseUrlMatch[1].trim().replace(/\/$/, '') : 'https://volkern.app/api';

async function check(timezone) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    return new Promise((resolve) => {
        const url = new URL(`${BASE_URL}/citas/disponibilidad?fecha=${dateStr}&duracion=30&timezone=${timezone}`);
        const req = https.request(url, {
            headers: { 'X-API-Key': API_KEY }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ tz: timezone, data: json });
                } catch (e) { resolve({ tz: timezone, error: data }); }
            });
        });
        req.end();
    });
}

async function run() {
    console.log('Checking Schedule for Tomorrow...');

    const madrid = await check('Europe/Madrid');
    const mexico = await check('America/Mexico_City');
    const uct = await check('UTC');

    [madrid, mexico, uct].forEach(r => {
        console.log(`\nTimezone: ${r.tz}`);
        if (r.data && r.data.horarioLaboral) {
            console.log(`  Resumen: ${r.data.horarioLaboral.resumen}`);
            if (r.data.disponibles && r.data.disponibles.slots && r.data.disponibles.slots.length > 0) {
                console.log(`  First Slot: ${r.data.disponibles.slots[0]}`);
                console.log(`  Last Slot:  ${r.data.disponibles.slots[r.data.disponibles.slots.length - 1]}`);
            } else {
                console.log('  No slots available.');
            }
        } else {
            console.log('  No schedule data or closed.');
        }
    });
}

run();
