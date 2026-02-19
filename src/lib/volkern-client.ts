import { Service, AvailabilityResponse, Lead, Appointment } from '../types/volkern';

const BASE_URL = '/api/volkern';
// No need for API_KEY here as the proxy handles it server-side

export class VolkernClient {
    private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    static async getServices(): Promise<Service[]> {
        try {
            const data = await this.request<any>('/servicios?activo=true');
            if (Array.isArray(data)) return data;
            if (data && typeof data === 'object' && 'services' in data && Array.isArray(data.services)) {
                return data.services;
            }
            // If it's not a valid format but we got a response (like the proxy's 401 JSON)
            // we catch it below if request() throws, or handle it here if it doesn't.
            return this.getFallbackServices();
        } catch (error) {
            console.warn('[VolkernClient] getServices failed, using fallback services:', error);
            return this.getFallbackServices();
        }
    }

    private static getFallbackServices(): Service[] {
        return [
            {
                id: "cmkbrkzn30005rx089kx50b9f",
                tenantId: "cmhmjkvra0000p99kz0pjz7k5",
                nombre: "Sesión de Conocimiento / Neting",
                descripcion: "Sesión estratégica inicial para conocer tu proyecto y determinar los próximos pasos en tu viaje de automatización.",
                duracionMinutos: 30,
                precio: 0,
                moneda: "MXN",
                modalidad: "virtual",
                activo: true,
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            },
            {
                id: "consultoria-expert",
                tenantId: "cmhmjkvra0000p99kz0pjz7k5",
                nombre: "Consultoría de Automatización de Ventas",
                descripcion: "Análisis completo de funnel de ventas y diseño de flujos de seguimiento automáticos.",
                duracionMinutos: 45,
                precio: 0,
                moneda: "EUR",
                modalidad: "presencial",
                activo: true,
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            }
        ];
    }

    static async getAvailability(fecha: string, duracion: number = 60, timezone: string = 'UTC'): Promise<AvailabilityResponse> {
        return this.request<AvailabilityResponse>(`/citas/disponibilidad?fecha=${fecha}&duracion=${duracion}&timezone=${timezone}`);
    }

    static async getLeadByEmail(email: string): Promise<Lead | null> {
        try {
            // Search returns an array of leads directly
            const leads = await this.request<Lead[]>(`/leads?query=${encodeURIComponent(email)}`);
            if (Array.isArray(leads) && leads.length > 0) {
                // IMPORTANT: The API performs a fuzzy search. We MUST filter by exact email match.
                const exactMatch = leads.find(l => l.email.toLowerCase() === email.toLowerCase());
                if (exactMatch) {
                    console.log(`[VolkernClient] Found exact match for ${email}: ${exactMatch.id}`);
                    return exactMatch;
                }
                console.log(`[VolkernClient] No exact match found for ${email} in ${leads.length} results.`);
            }
            return null;
        } catch (error) {
            console.warn('[VolkernClient] Error searching lead:', error);
            return null;
        }
    }

    static async upsertLead(leadData: Lead): Promise<Lead> {
        // 1. Check if lead exists
        const existingLead = await this.getLeadByEmail(leadData.email);

        if (existingLead && existingLead.id) {
            console.log(`[VolkernClient] Lead exists (${existingLead.id}), skipping creation.`);
            // Optionally update context here if API supports PATCH /leads/:id
            // For now, return existing to proceed with booking
            return existingLead;
        }

        // 2. Create if not exists
        console.log(`[VolkernClient] Lead not found, creating new lead for ${leadData.email}`);
        const response = await this.request<any>('/leads', {
            method: 'POST',
            body: JSON.stringify(leadData),
        });

        // Handle nested response from create endpoint { success: true, lead: { ... } }
        if (response && response.lead) {
            return response.lead;
        }
        return response;
    }

    static async createAppointment(appointmentData: Appointment): Promise<Appointment> {
        return this.request<Appointment>('/citas', {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }
}
