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
                console.error(`[Request Error] ${endpoint}:`, err.message);
                resolve({ status: 0, data: err.message });
            });
            if (body) req.write(JSON.stringify(body));
            req.end();
        } catch (e) {
            console.error(`[URL Error] ${endpoint}:`, e.message);
            resolve({ status: 0, data: e.message });
        }
    });
}

async function verify() {
    console.log('--- VOLKERN CRM FULL INTEGRATION TEST ---');
    console.log('Base URL:', BASE_URL);

    // 1. Catalog
    console.log('\n[1] Testing Catalog Access...');
    const catalogRes = await request('/catalogo?tipo=servicio&limit=5');
    console.log('Status:', catalogRes.status);
    if (catalogRes.status === 200) {
        const items = catalogRes.data.items || catalogRes.data;
        console.log('Success: Found', Array.isArray(items) ? items.length : 0, 'items');
    } else {
        console.log('Error Content:', catalogRes.data);
    }

    // 2. Pipeline Stages
    console.log('\n[2] Testing Pipeline Stages...');
    const stagesRes = await request('/pipeline/stages');
    console.log('Status:', stagesRes.status);
    if (stagesRes.status === 200) {
        console.log('Success: Found', stagesRes.data.length, 'stages');
    } else {
        console.log('Error Content:', stagesRes.data);
    }

    // 3. Lead Creation
    const testEmail = `agent_test_${Date.now()}@example.com`;
    console.log(`\n[3] Testing Lead Creation (${testEmail})...`);
    const leadRes = await request('/leads', 'POST', {
        nombre: 'Full Test User',
        email: testEmail,
        canal: 'otro'
    });
    console.log('Status:', leadRes.status);

    if (leadRes.status !== 201 && leadRes.status !== 200) {
        console.log('Lead Creation Failed. Error Content:', leadRes.data);
        return;
    }

    const leadId = leadRes.data?.lead?.id || leadRes.data?.id;
    console.log('Lead created ID:', leadId);

    // 4. Deal Creation
    console.log('\n[4] Testing Deal Creation...');
    const dealRes = await request('/deals', 'POST', {
        titulo: 'Test Opportunity from Agent',
        valor: 1500,
        leadId: leadId,
        prioridad: 'alta'
    });
    console.log('Status:', dealRes.status);
    if (dealRes.status !== 201 && dealRes.status !== 200) {
        console.log('Deal creation failed:', dealRes.data);
    } else {
        console.log('Deal created successfully');
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
