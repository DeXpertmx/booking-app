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
const EMAIL_TO_SEARCH = 'melittaphotography@gmail.com';

async function request(endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            method: 'GET',
            headers: {
                'X-API-Key': API_KEY,
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
        req.end();
    });
}

async function testParam(paramName) {
    console.log(`\nTesting param: ${paramName}`);
    const res = await request(`/leads?${paramName}=${encodeURIComponent(EMAIL_TO_SEARCH)}`);
    console.log('Status:', res.status);
    const leads = Array.isArray(res.data) ? res.data : (res.data.leads || []);
    console.log('Leads count:', leads.length);
    if (leads.length > 0) {
        console.log('First lead email:', leads[0].email);
    }
}

async function run() {
    await testParam('search');
    await testParam('query');
    await testParam('email');
}

run();
