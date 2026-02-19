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
const EMAIL_TO_SEARCH = 'hugo@dimension.expert';

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
                    resolve({ status: res.statusCode, data: data.substring(0, 100) });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('Testing lead search logic...');

    // Test 1: Search by ?query param
    console.log(`\nEndpoint: /leads?query=${EMAIL_TO_SEARCH}`);
    const res1 = await request(`/leads?query=${EMAIL_TO_SEARCH}`);
    console.log('Status:', res1.status);
    if (res1.data && res1.data.leads) {
        console.log('Leads found:', res1.data.leads.length);
        if (res1.data.leads.length > 0) {
            console.log('First lead ID:', res1.data.leads[0].id);
            console.log('First lead Email:', res1.data.leads[0].email);
        }
    } else {
        console.log('Response (snippet):', JSON.stringify(res1.data).substring(0, 200));
    }

    // Test 2: Search by ?email param
    console.log(`\nEndpoint: /leads?email=${EMAIL_TO_SEARCH}`);
    const res2 = await request(`/leads?email=${EMAIL_TO_SEARCH}`);
    console.log('Status:', res2.status);
    if (res2.data && res2.data.leads) {
        console.log('Leads found:', res2.data.leads.length);
    } else {
        console.log('Response (snippet):', JSON.stringify(res2.data).substring(0, 200));
    }
}

run();
