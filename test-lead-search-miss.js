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
const NON_EXISTENT_EMAIL = `nonexistent-${Date.now()}@test.com`;

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
    console.log(`Testing search for non-existent email: ${NON_EXISTENT_EMAIL}`);

    // Test 1: Search by ?query param
    console.log(`\nEndpoint: /leads?query=${NON_EXISTENT_EMAIL}`);
    const res1 = await request(`/leads?query=${NON_EXISTENT_EMAIL}`);
    console.log('Status:', res1.status);

    if (res1.data && res1.data.leads) { // Check if it returns an array of leads actually
        // The previous test showed it returns an Array directly, BUT let's be careful. 
        // Actually the previous test output was:
        // Response (snippet): [{"id":"...
        // So it returns an ARRAY directly.
        // Wait, the code in getLeadByEmail handles array.

        const leads = Array.isArray(res1.data) ? res1.data : (res1.data.leads || []);

        console.log('Leads found:', leads.length);
        if (leads.length > 0) {
            console.log('First lead ID:', leads[0].id);
            console.log('First lead Email:', leads[0].email);

            if (leads[0].email !== NON_EXISTENT_EMAIL) {
                console.error('CRITICAL: Returned lead email DOES NOT match searched email!');
            }
        } else {
            console.log('Correct behavior: No leads found.');
        }
    } else if (Array.isArray(res1.data)) {
        console.log('Leads found (Array):', res1.data.length);
        if (res1.data.length > 0) {
            console.log('First lead ID:', res1.data[0].id);
            console.log('First lead Email:', res1.data[0].email);
            if (res1.data[0].email !== NON_EXISTENT_EMAIL) {
                console.error('CRITICAL: Returned lead email DOES NOT match searched email!');
            }
        } else {
            console.log('Correct behavior: No leads found.');
        }
    } else {
        console.log('Response (raw):', JSON.stringify(res1.data).substring(0, 200));
    }
}

run();
