const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/VOLKERN_API_KEY=(.+)/);
const baseUrlMatch = envContent.match(/VOLKERN_BASE_URL=(.+)/);

if (!apiKeyMatch) {
    console.error('Missing VOLKERN_API_KEY in .env.local');
    process.exit(1);
}

const API_KEY = apiKeyMatch[1].trim().replace(/^["']|["']$/g, '');
const BASE_URL = (baseUrlMatch ? baseUrlMatch[1].trim() : 'https://volkern.app/api').replace(/\/$/, '');

async function request(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        try {
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
            req.on('error', (err) => {
                resolve({ status: 0, data: err.message });
            });
            if (body) req.write(JSON.stringify(body));
            req.end();
        } catch (e) {
            resolve({ status: 0, data: e.message });
        }
    });
}

async function debug() {
    console.log('--- VOLKERN API DEBUG ---');

    // Test 1: List Leads
    console.log('\n[1] Testing List Leads (/leads)...');
    const leadsRes = await request('/leads?limit=1');
    console.log('Status:', leadsRes.status);
    console.log('Content:', JSON.stringify(leadsRes.data).substring(0, 200));

    // Test 2: List Services (Legacy)
    console.log('\n[2] Testing List Services (/servicios)...');
    const servicesRes = await request('/servicios');
    console.log('Status:', servicesRes.status);
    console.log('Content:', JSON.stringify(servicesRes.data).substring(0, 200));

    // Test 3: List Conversations
    console.log('\n[3] Testing List Conversations (/mensajes/conversaciones)...');
    const convRes = await request('/mensajes/conversaciones?limit=1');
    console.log('Status:', convRes.status);
    console.log('Content:', JSON.stringify(convRes.data).substring(0, 200));

    console.log('\n--- DEBUG COMPLETE ---');
}

debug().catch(console.error);
