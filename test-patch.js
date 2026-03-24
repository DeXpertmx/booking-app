const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/VOLKERN_API_KEY=(.+)/);
const baseUrlMatch = envContent.match(/VOLKERN_BASE_URL=(.+)/);

const API_KEY = apiKeyMatch[1].trim().replace(/^["']|["']$/g, '');
const BASE_URL = baseUrlMatch[1].trim().replace(/\/$/, '');
const EMAIL_TO_TEST = 'melittaphotography@gmail.com';

async function request(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
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
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log(`Testing PATCH for lead with email: ${EMAIL_TO_TEST}`);

    // 1. Find lead
    const findRes = await request(`/leads?search=${encodeURIComponent(EMAIL_TO_TEST)}`);
    const leads = Array.isArray(findRes.data) ? findRes.data : (findRes.data.leads || []);

    if (leads.length === 0) {
        console.error('Lead not found for patch test');
        return;
    }

    const lead = leads[0];
    console.log(`Found lead ID: ${lead.id}`);

    // 2. Try PATCH
    console.log('Attempting PATCH...');
    const patchRes = await request(`/leads/${lead.id}`, 'PATCH', {
        nombre: lead.nombre + ' (Updated)',
        notas: 'Test update at ' + new Date().toISOString()
    });

    console.log('PATCH Status:', patchRes.status);
    console.log('PATCH Response:', JSON.stringify(patchRes.data, null, 2));
}

run();
