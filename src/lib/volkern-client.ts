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

    static async getAvailability(fecha: string, duracion: number = 60): Promise<AvailabilityResponse> {
        return this.request<AvailabilityResponse>(`/citas/disponibilidad?fecha=${fecha}&duracion=${duracion}`);
    }

    static async upsertLead(leadData: Lead): Promise<Lead> {
        return this.request<Lead>('/leads', {
            method: 'POST',
            body: JSON.stringify(leadData),
        });
    }

    static async createAppointment(appointmentData: Appointment): Promise<Appointment> {
        return this.request<Appointment>('/citas', {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }
}
