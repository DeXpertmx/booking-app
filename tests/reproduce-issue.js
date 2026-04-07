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
const TEST_EMAIL = `test-repro-${Date.now()}@example.com`;

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

async function simulateBooking(stepName) {
    console.log(`\n--- Booking Simulation: ${stepName} ---`);

    // 1. Upsert Lead
    console.log(`Upserting lead for ${TEST_EMAIL}...`);
    // Simulate what VolkernClient.upsertLead does

    // a. Get lead by email
    const searchRes = await request(`/leads?search=${encodeURIComponent(TEST_EMAIL)}`);
    const leads = Array.isArray(searchRes.data) ? searchRes.data : (searchRes.data.leads || []);
    const existingLead = leads.find(l => l.email && l.email.toLowerCase() === TEST_EMAIL.toLowerCase());

    let lead;
    if (existingLead) {
        console.log(`Lead exists (${existingLead.id}), PATCHing...`);
        const patchRes = await request(`/leads/${existingLead.id}`, 'PATCH', {
            nombre: "Repro User",
            email: TEST_EMAIL,
            canal: 'web'
        });
        console.log('PATCH Status:', patchRes.status);
        lead = patchRes.data.lead || patchRes.data;
    } else {
        console.log(`Lead not found, POSTing...`);
        const postRes = await request('/leads', 'POST', {
            nombre: "Repro User",
            email: TEST_EMAIL,
            canal: "otro"
        });
        console.log('POST Status:', postRes.status);
        lead = postRes.data.lead || postRes.data;
    }

    if (!lead || !lead.id) {
        console.error('Failed to get lead ID!', JSON.stringify(lead));
        return false;
    }
    console.log('Target Lead ID:', lead.id);

    // 2. Create Appointment
    const date = new Date();
    date.setDate(date.getDate() + 7); // 1 week from now
    const dateStr = date.toISOString().split('T')[0];

    // Get availability first to find a slot
    const availRes = await request(`/citas/disponibilidad?fecha=${dateStr}&duracion=30`);
    const slots = (availRes.data && availRes.data.disponibles && availRes.data.disponibles.slots) || [];

    if (slots.length === 0) {
        console.error('No slots available for test date');
        return false;
    }

    const slot = slots[0];
    console.log(`Booking slot: ${slot}`);

    const apptRes = await request('/citas', 'POST', {
        leadId: lead.id,
        fechaHora: slot,
        tipo: 'reunion',
        titulo: `Repro Appt ${stepName}`,
        duracion: 30,
        servicioId: "cmkbrkzn30005rx089kx50b9f"
    });

    console.log('Appointment Status:', apptRes.status);
    if (apptRes.status !== 200 && apptRes.status !== 201) {
        console.error('Appointment Error:', JSON.stringify(apptRes.data));
        return false;
    }

    return true;
}

async function run() {
    console.log(`Starting reproduction for email: ${TEST_EMAIL}`);
    const firstOk = await simulateBooking('First Booking');
    if (!firstOk) {
        console.error('First booking failed, cannot proceed with repro.');
        return;
    }

    console.log('\nWaiting a bit...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const secondOk = await simulateBooking('Second Booking');
    if (secondOk) {
        console.log('\nSUCCESS: Second booking also worked. Issue not reproduced with this logic.');
    } else {
        console.log('\nREPRODUCED: Second booking failed!');
    }
}

run();
