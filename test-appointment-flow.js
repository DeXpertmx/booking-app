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

        if (body) req.write(JSON.stringify(body));
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('--- 1. Search Lead ---');
    const searchRes = await request(`/leads?query=${EMAIL_TO_SEARCH}`);

    let leadId;
    if (!searchRes.data || !searchRes.data.leads || searchRes.data.leads.length === 0) {
        console.log('Lead not found. Creating test lead...');
        const createRes = await request('/leads', 'POST', {
            nombre: "Test User Flow",
            email: EMAIL_TO_SEARCH,
            telefono: "5551234567",
            canal: "test_script"
        });
        if (createRes.data && createRes.data.lead && createRes.data.lead.id) {
            leadId = createRes.data.lead.id;
            console.log('Created Lead ID:', leadId);
        } else {
            console.error('Failed to create lead:', JSON.stringify(createRes.data));
            return;
        }
    } else {
        leadId = searchRes.data.leads[0].id;
        console.log(`Found Lead ID: ${leadId}`);
    }

    console.log('\n--- 2. Get Availability ---');
    // Using tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const duracion = 30;

    console.log(`Checking availability for ${dateStr}...`);
    const availRes = await request(`/citas/disponibilidad?fecha=${dateStr}&duracion=${duracion}&timezone=Europe/Madrid`);

    let validSlot = null;
    if (availRes.data && availRes.data.disponibles && availRes.data.disponibles.slots && availRes.data.disponibles.slots.length > 0) {
        validSlot = availRes.data.disponibles.slots[0];
        console.log('Found valid slot:', validSlot);
    } else {
        console.error('No slots available for tomorrow. Cannot test booking.');
        console.log('Avail response snippet:', JSON.stringify(availRes.data).substring(0, 200));
        return;
    }

    console.log('\n--- 3. Create Appointment (POST /citas) ---');
    const appointmentPayload = {
        leadId: leadId,
        fechaHora: validSlot, // Use the real available slot
        tipo: 'reunion',
        titulo: `TEST Cita Script - ${new Date().toLocaleTimeString()}`,
        descripcion: "Prueba de script de creación de citas",
        duracion: duracion,
        servicioId: "cmkbrkzn30005rx089kx50b9f"
    };

    console.log('Payload:', JSON.stringify(appointmentPayload, null, 2));

    const apptRes = await request('/citas', 'POST', appointmentPayload);
    console.log(`Status: ${apptRes.status}`);
    console.log('Response:', JSON.stringify(apptRes.data, null, 2));
}

run();
