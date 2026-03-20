const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local
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

async function request(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            method,
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
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function verify() {
    // 0. Verify Connectivity (Legacy)
    console.log('\n[0] Testing connectivity (/servicios)...');
    const legacyRes = await request('/servicios?activo=true');
    console.log('Status:', legacyRes.status);
    if (legacyRes.status === 200) {
        console.log('Connectivity confirmed (legacy endpoint works)');
    } else {
        console.log('Connectivity failed:', legacyRes.status, legacyRes.data);
    }

    // 1. Verify Catalog
    console.log('\n[1] Testing Catalog (/catalogo?tipo=servicio)...');
    const catalogRes = await request('/catalogo?tipo=servicio&activo=true');
    console.log('Status:', catalogRes.status);
    if (catalogRes.status === 200) {
        const items = catalogRes.data.items || catalogRes.data;
        console.log('Items found:', Array.isArray(items) ? items.length : 'N/A');
        if (Array.isArray(items) && items.length > 0) {
            console.log('Sample item:', items[0].nombre, `(ID: ${items[0].id})`);
        }
    } else {
        console.log('Error:', catalogRes.data);
    }

    // 2. Verify Lead Upsert (Search + Patch)
    const testEmail = 'test_integration_' + Date.now() + '@example.com';
    console.log(`\n[2] Testing Lead Creation (/leads) with ${testEmail}...`);
    const createRes = await request('/leads', 'POST', {
        nombre: 'Test Integration User',
        email: testEmail,
        canal: 'web'
    });
    console.log('Status:', createRes.status);
    const leadId = createRes.data?.lead?.id || createRes.data?.id;

    if (leadId) {
        console.log('Lead created ID:', leadId);

        // 3. Verify Interaction
        console.log('\n[3] Testing Interaction Creation...');
        const interactionRes = await request(`/leads/${leadId}/interactions`, 'POST', {
            tipo: 'reunion',
            contenido: 'Test interaction from integration script',
            resultado: 'positivo'
        });
        console.log('Status:', interactionRes.status);
        if (interactionRes.status === 201 || interactionRes.status === 200) {
            console.log('Interaction created successfully');
        } else {
            console.log('Error:', interactionRes.data);
        }
    } else {
        console.log('Lead creation failed, skipping interaction test.');
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
