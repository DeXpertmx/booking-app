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
            req.on('error', (err) => resolve({ status: 0, data: err.message }));
            if (body) req.write(JSON.stringify(body));
            req.end();
        } catch (e) {
            resolve({ status: 0, data: e.message });
        }
    });
}

async function inspect() {
    console.log('\n[INSPECT] Fetching Lead Details...');
    const leadsRes = await request('/leads?limit=1');
    if (leadsRes.status === 200) {
        const lead = Array.isArray(leadsRes.data) ? leadsRes.data[0] : (leadsRes.data.leads ? leadsRes.data.leads[0] : null);
        if (lead) {
            console.log('Lead structure:', JSON.stringify(lead, null, 2));
        } else {
            console.log('No leads found.');
        }
    } else {
        console.log('Error fetching leads:', leadsRes.status);
    }
}

inspect().catch(console.error);
