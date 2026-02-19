export interface Service {
    id: string;
    tenantId: string;
    nombre: string;
    descripcion: string;
    duracionMinutos: number;
    precio: number;
    moneda: string;
    modalidad: 'presencial' | 'virtual' | 'hibrido';
    activo: boolean;
    fechaCreacion: string;
    fechaActualizacion: string;
}

export interface AvailabilitySlot {
    fecha: string;
    slots: string[]; // ISO timestamps
}

export interface AvailabilityResponse {
    fecha: string;
    dia: string;
    diaActivo: boolean;
    horarioLaboral: {
        rangos: { inicio: string; fin: string }[];
        resumen: string;
    };
    disponibles: {
        total: number;
        slots: string[];
    };
    ocupados: {
        total: number;
        slots: { hora: string; cita: { id: string; titulo: string } }[];
    };
}

export interface Lead {
    id?: string;
    nombre: string;
    email: string;
    telefono?: string;
    empresa?: string;
    canal?: string;
    estado?: string;
    notas?: string;
    contextoProyecto?: string;
}

export interface Appointment {
    id?: string;
    leadId: string;
    fechaHora: string;
    tipo: 'reunion' | 'servicio' | 'llamada' | 'otro';
    titulo: string;
    descripcion?: string;
    duracion: number;
    servicioId?: string;
    estado?: string;
}
