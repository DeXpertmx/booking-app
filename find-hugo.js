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

async function run() {
    console.log('Fetching all leads to find hugo@dimension.expert...');
    const res = await request('/leads?limit=100');
    const leads = Array.isArray(res.data) ? res.data : (res.data.leads || []);
    console.log('Total leads fetched:', leads.length);
    const hugo = leads.find(l => l.email === 'hugo@dimension.expert');
    if (hugo) {
        console.log('Found Hugo!', hugo.id);
    } else {
        console.log('Hugo NOT found in the first 100 leads.');
        console.log('Sample emails:', leads.slice(0, 5).map(l => l.email));
    }
}

run();
