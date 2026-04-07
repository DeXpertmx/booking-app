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

    static async getServices(): Promise<Service[]> {
        try {
            const data = await this.request<any>('/servicios?activo=true');

            let services: any[] = [];
            if (Array.isArray(data)) {
                services = data;
            } else if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
                services = data.items;
            } else if (data && typeof data === 'object' && 'services' in data && Array.isArray(data.services)) {
                services = data.services;
            }

            if (services.length > 0) {
                return services.map(item => ({
                    ...item,
                    precio: item.precio ?? item.precioBase ?? 0
                }));
            }

            return this.getFallbackServices();
        } catch (error) {
            console.warn('[VolkernClient] getServices failed, trying /catalogo fallback:', error);
            return this.getServicesViaCatalogo();
        }
    }

    private static async getServicesViaCatalogo(): Promise<Service[]> {
        try {
            const data = await this.request<any>('/catalogo?tipo=servicio&activo=true');

            let services: any[] = [];
            if (Array.isArray(data)) {
                services = data;
            } else if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
                services = data.items;
            }

            if (services.length > 0) {
                return services.map(item => ({
                    ...item,
                    precio: item.precio ?? item.precioBase ?? 0
                }));
            }
        } catch (error) {
            console.warn('[VolkernClient] /catalogo fallback also failed:', error);
        }

        return this.getFallbackServices();
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

    static async getAvailability(fecha: string, duracion: number = 60, timezone: string = 'UTC'): Promise<AvailabilityResponse> {
        return this.request<AvailabilityResponse>(`/citas/disponibilidad?fecha=${fecha}&duracion=${duracion}&timezone=${timezone}`);
    }

    static async createAppointment(appointmentData: Appointment): Promise<Appointment> {
        return this.request<Appointment>('/citas', {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }

    static async getLeadByEmail(email: string): Promise<Lead | null> {
        try {
            const response = await this.request<any>(`/leads?search=${encodeURIComponent(email)}&limit=100`);
            console.log(`[VolkernClient] Search response for ${email}:`, JSON.stringify(response).substring(0, 500));

            const leads = this.extractLeadsArray(response);

            if (leads.length > 0) {
                const exactMatch = leads.find((l: Lead) => l.email?.toLowerCase() === email.toLowerCase());
                if (exactMatch) {
                    console.log(`[VolkernClient] Found exact match for ${email}: ${exactMatch.id}`);
                    return exactMatch;
                }

                const partialMatch = leads.find((l: Lead) => l.email?.toLowerCase().includes(email.toLowerCase()));
                if (partialMatch) {
                    console.log(`[VolkernClient] Found partial match for ${email}: ${partialMatch.id}`);
                    return partialMatch;
                }
            }
            return null;
        } catch (error) {
            console.warn('[VolkernClient] Error searching lead:', error);
            return null;
        }
    }

    private static extractLeadsArray(response: any): any[] {
        if (Array.isArray(response)) return response;
        if (response?.leads && Array.isArray(response.leads)) return response.leads;
        if (response?.data && Array.isArray(response.data)) return response.data;
        if (response?.items && Array.isArray(response.items)) return response.items;
        if (response?.results && Array.isArray(response.results)) return response.results;
        return [];
    }

    static async upsertLead(leadData: Lead): Promise<Lead> {
        const sanitizedData = Object.fromEntries(
            Object.entries(leadData).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
        ) as Lead;

        let existingLead = await this.getLeadByEmail(sanitizedData.email);

        if (!existingLead && sanitizedData.nombre) {
            existingLead = await this.getLeadByName(sanitizedData.nombre);
        }

        if (existingLead && existingLead.id) {
            console.log(`[VolkernClient] Lead exists (${existingLead.id}), updating...`);
            const response = await this.request<any>(`/leads/${existingLead.id}`, {
                method: 'PATCH',
                body: JSON.stringify(sanitizedData),
            });
            return this.extractLeadFromResponse(response, existingLead.id);
        }

        console.log(`[VolkernClient] Lead not found, creating new lead for ${sanitizedData.email}`);
        const response = await this.request<any>('/leads', {
            method: 'POST',
            body: JSON.stringify(sanitizedData),
        });

        return this.extractLeadFromResponse(response);
    }

    private static async getLeadByName(name: string): Promise<Lead | null> {
        try {
            const searchTerm = name.split(' ')[0];
            const response = await this.request<any>(`/leads?search=${encodeURIComponent(searchTerm)}&limit=100`);
            const leads = this.extractLeadsArray(response);

            if (leads.length > 0) {
                const match = leads.find((l: Lead) =>
                    l.nombre?.toLowerCase().trim() === name.toLowerCase().trim() ||
                    l.nombre?.toLowerCase().includes(name.toLowerCase())
                );
                if (match) {
                    console.log(`[VolkernClient] Found lead by name "${name}": ${match.id}`);
                    return match;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    private static extractLeadFromResponse(response: any, fallbackId?: string): Lead {
        console.log('[VolkernClient] Raw lead response:', JSON.stringify(response).substring(0, 500));

        if (response?.lead?.id) return response.lead;
        if (response?.id) return response;
        if (response?.data?.id) return response.data;
        if (response?.success && response?.lead) return response.lead;
        if (fallbackId) return { ...response, id: fallbackId };

        throw new Error(`Could not get lead ID from CRM. Response: ${JSON.stringify(response).substring(0, 300)}`);
    }

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
