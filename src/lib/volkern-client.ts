import { Service, AvailabilityResponse, Lead, Appointment, Interaction, LeadNote, Deal, PipelineStage, SalesForecast, Quote, Contract } from '../types/volkern';

const BASE_URL = '/api/volkern';

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

    // === Catalog & Services ===
    static async getServices(): Promise<Service[]> {
        try {
            // Updated to use the new catalog endpoint
            const data = await this.request<any>('/catalogo?tipo=servicio&activo=true');

            let services: any[] = [];
            if (Array.isArray(data)) {
                services = data;
            } else if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
                services = data.items;
            } else if (data && typeof data === 'object' && 'services' in data && Array.isArray(data.services)) {
                services = data.services;
            }

            if (services.length > 0) {
                // Map precioBase to precio for backward compatibility if needed
                return services.map(item => ({
                    ...item,
                    precio: item.precio ?? item.precioBase ?? 0
                }));
            }

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
                nombre: "Sesión de Conocimiento / Neting",
                descripcion: "Sesión estratégica inicial para conocer tu proyecto y determinar los próximos pasos en tu viaje de automatización.",
                duracionMinutos: 30,
                precioBase: 0,
                precio: 0,
                moneda: "MXN",
                modalidad: "virtual",
                tipo: "servicio",
                activo: true
            }
        ];
    }

    // === Appointments ===
    static async getAvailability(fecha: string, duracion: number = 60, timezone: string = 'UTC'): Promise<AvailabilityResponse> {
        return this.request<AvailabilityResponse>(`/citas/disponibilidad?fecha=${fecha}&duracion=${duracion}&timezone=${timezone}`);
    }

    static async createAppointment(appointmentData: Appointment): Promise<Appointment> {
        return this.request<Appointment>('/citas', {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }

    // === Leads ===
    static async getLeadByEmail(email: string): Promise<Lead | null> {
        try {
            // Search via query parameter
            const response = await this.request<any>(`/leads?search=${encodeURIComponent(email)}`);
            const leads = Array.isArray(response) ? response : (response.leads || []);

            if (Array.isArray(leads) && leads.length > 0) {
                const exactMatch = leads.find((l: Lead) => l.email.toLowerCase() === email.toLowerCase());
                if (exactMatch) {
                    console.log(`[VolkernClient] Found exact match for ${email}: ${exactMatch.id}`);
                    return exactMatch;
                }
            }
            return null;
        } catch (error) {
            console.warn('[VolkernClient] Error searching lead:', error);
            return null;
        }
    }

    static async upsertLead(leadData: Lead): Promise<Lead> {
        const existingLead = await this.getLeadByEmail(leadData.email);

        if (existingLead && existingLead.id) {
            console.log(`[VolkernClient] Lead exists (${existingLead.id}), updating...`);
            return this.request<Lead>(`/leads/${existingLead.id}`, {
                method: 'PATCH',
                body: JSON.stringify(leadData),
            });
        }

        console.log(`[VolkernClient] Lead not found, creating new lead for ${leadData.email}`);
        const response = await this.request<any>('/leads', {
            method: 'POST',
            body: JSON.stringify(leadData),
        });

        return response.lead || response;
    }

    // === Pipeline & Deals ===
    static async getPipelineStages(): Promise<PipelineStage[]> {
        return this.request<PipelineStage[]>('/pipeline/stages');
    }

    static async getDeals(filters: any = {}): Promise<Deal[]> {
        const params = new URLSearchParams(filters).toString();
        const response = await this.request<any>(`/deals${params ? `?${params}` : ''}`);
        return response.deals || response;
    }

    static async createDeal(dealData: Deal): Promise<Deal> {
        return this.request<Deal>('/deals', {
            method: 'POST',
            body: JSON.stringify(dealData),
        });
    }

    static async getSalesForecast(periodo: 'mes' | 'trimestre' | 'año' = 'mes'): Promise<SalesForecast> {
        return this.request<SalesForecast>(`/deals/forecast?periodo=${periodo}`);
    }

    // === Quotes & Cotizaciones ===
    static async createQuote(quoteData: Quote): Promise<Quote> {
        return this.request<Quote>('/cotizaciones', {
            method: 'POST',
            body: JSON.stringify(quoteData),
        });
    }

    static async sendQuote(quoteId: string, mensaje?: string): Promise<any> {
        return this.request(`/cotizaciones/${quoteId}/send`, {
            method: 'POST',
            body: JSON.stringify({ mensaje }),
        });
    }

    // === Contracts ===
    static async createContract(contractData: Contract): Promise<Contract> {
        return this.request<Contract>('/contratos', {
            method: 'POST',
            body: JSON.stringify(contractData),
        });
    }

    static async createContractFromQuote(quoteId: string, data: any = {}): Promise<Contract> {
        return this.request<Contract>(`/contratos/from-cotizacion/${quoteId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // === Interactions & Notes ===
    static async createInteraction(interactionData: Interaction): Promise<any> {
        const { leadId, ...data } = interactionData;
        return this.request(`/leads/${leadId}/interactions`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async createNote(noteData: LeadNote): Promise<any> {
        const { leadId, ...data } = noteData;
        return this.request(`/leads/${leadId}/notes`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}
