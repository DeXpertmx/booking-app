export interface CatalogItem {
    id: string;
    nombre: string;
    descripcion?: string;
    sku?: string;
    tipo: 'producto' | 'servicio' | 'cita' | 'academia';
    precioBase: number;
    moneda: string;
    duracionMinutos?: number;
    modalidad?: 'presencial' | 'virtual' | 'hibrido';
    activo: boolean;
    categoriaFiscal?: string;
    categorias?: string[];
    etiquetas?: string[];
    metadata?: Record<string, any>;
}

export interface Service extends CatalogItem {
    tenantId?: string;
    precio?: number; // Added for backward compatibility with UI
    fechaCreacion?: string;
    fechaActualizacion?: string;
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
    etiquetas?: string[];
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

export interface Interaction {
    id?: string;
    leadId: string;
    tipo: 'llamada' | 'email' | 'whatsapp' | 'reunion' | 'nota' | 'otro';
    contenido: string;
    resultado?: 'positivo' | 'neutro' | 'negativo';
    metadatos?: Record<string, any>;
    fechaCreacion?: string;
}

export interface LeadNote {
    id?: string;
    leadId: string;
    contenido: string;
    titulo?: string;
    fechaCreacion?: string;
}

export interface Deal {
    id?: string;
    titulo: string;
    valor?: number;
    moneda?: string;
    etapa?: string;
    prioridad?: 'baja' | 'media' | 'alta';
    probabilidad?: number;
    fechaEstimadaCierre?: string;
    leadId?: string;
    contactId?: string;
    companyId?: string;
    descripcion?: string;
    estado?: 'abierto' | 'ganado' | 'perdido';
}

export interface QuoteItem {
    id?: string;
    concepto: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
    tasaImpuestoId?: string;
}

export interface Quote {
    id?: string;
    numero?: string;
    estado?: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'expirada';
    leadId?: string;
    dealId?: string;
    validezDias?: number;
    notas?: string;
    items: QuoteItem[];
    subtotal?: number;
    iva?: number;
    total?: number;
    urlPublica?: string;
}

export interface Contract {
    id?: string;
    numero?: string;
    titulo: string;
    tipo?: 'servicios' | 'productos' | 'suscripcion' | 'proyecto' | 'otro';
    estado?: 'borrador' | 'enviado' | 'firmado_cliente' | 'firmado_empresa' | 'activo' | 'completado' | 'cancelado';
    leadId?: string;
    dealId?: string;
    cotizacionId?: string;
    fechaInicio?: string;
    fechaFin?: string;
    metodoPago?: 'unico' | 'mensual' | 'trimestral' | 'anual';
    total?: number;
    urlPublica?: string;
}

export interface SalesForecast {
    basicForecast: { total: number; ponderado: number };
    adjustedForecast: { total: number; confianza: number };
    conversionRates: Record<string, { teorica: number; real: number }>;
    cycleTime: { promedioDias: number };
    projection6Months: { mes: string; estimado: number }[];
    historicalSales: { mes: string; total: number }[];
    funnel: { etapa: string; cantidad: number; valor: number }[];
    topDeals: { id: string; titulo: string; valorPonderado: number }[];
}

export interface PipelineStage {
    id: string;
    nombre: string;
    probabilidad: number;
    orden: number;
}
