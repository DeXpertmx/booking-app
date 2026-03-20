#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// ============================================
// Configuration
// ============================================
const VOLKERN_API_URL = process.env.VOLKERN_API_URL || "https://volkern.app/api";
const VOLKERN_API_KEY = process.env.VOLKERN_API_KEY || "";
if (!VOLKERN_API_KEY) {
    console.error("Error: VOLKERN_API_KEY environment variable is required");
    process.exit(1);
}
// ============================================
// API Helper
// ============================================
async function volkernRequest(endpoint, method = "GET", body) {
    const url = `${VOLKERN_API_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            "Authorization": `Bearer ${VOLKERN_API_KEY}`,
            "Content-Type": "application/json",
        },
    };
    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Volkern API Error (${response.status}): ${JSON.stringify(errorData)}`);
    }
    return response.json();
}
// ============================================
// Tool Definitions
// ============================================
const tools = [
    // === LEADS ===
    {
        name: "volkern_list_leads",
        description: "List leads with optional filters. Returns paginated results.",
        inputSchema: {
            type: "object",
            properties: {
                estado: {
                    type: "string",
                    enum: ["nuevo", "contactado", "calificado", "negociacion", "cliente", "perdido"],
                    description: "Filter by lead status"
                },
                canal: {
                    type: "string",
                    enum: ["web", "referido", "whatsapp", "telefono", "email", "otro"],
                    description: "Filter by acquisition channel"
                },
                search: {
                    type: "string",
                    description: "Search by name, email, or phone"
                },
                page: { type: "number", description: "Page number (default: 1)" },
                limit: { type: "number", description: "Results per page (default: 50, max: 100)" }
            }
        }
    },
    {
        name: "volkern_get_lead",
        description: "Get detailed information about a specific lead by ID",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "The lead's unique ID" }
            },
            required: ["leadId"]
        }
    },
    {
        name: "volkern_create_lead",
        description: "Create a new lead in the CRM. If email already exists, updates the existing lead.",
        inputSchema: {
            type: "object",
            properties: {
                nombre: { type: "string", description: "Lead's full name (required)" },
                email: { type: "string", description: "Email address" },
                telefono: { type: "string", description: "Phone number with country code (e.g., +34612345678)" },
                empresa: { type: "string", description: "Company name" },
                canal: {
                    type: "string",
                    enum: ["web", "referido", "whatsapp", "telefono", "email", "otro"],
                    description: "Acquisition channel"
                },
                estado: {
                    type: "string",
                    enum: ["nuevo", "contactado", "calificado", "negociacion", "cliente", "perdido"],
                    description: "Initial status (default: nuevo)"
                },
                etiquetas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags for categorization"
                },
                notas: { type: "string", description: "Initial notes" },
                contextoProyecto: { type: "string", description: "Project context or requirements" }
            },
            required: ["nombre"]
        }
    },
    {
        name: "volkern_update_lead",
        description: "Update an existing lead's information",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "The lead's unique ID" },
                nombre: { type: "string" },
                email: { type: "string" },
                telefono: { type: "string" },
                empresa: { type: "string" },
                canal: { type: "string" },
                estado: { type: "string" },
                etiquetas: { type: "array", items: { type: "string" } },
                notas: { type: "string" }
            },
            required: ["leadId"]
        }
    },
    // === APPOINTMENTS ===
    {
        name: "volkern_check_disponibilidad",
        description: "Check available time slots for a specific date. Always call this before booking.",
        inputSchema: {
            type: "object",
            properties: {
                fecha: { type: "string", description: "Date in YYYY-MM-DD format" },
                duracion: { type: "number", description: "Duration in minutes (default: 60)" }
            },
            required: ["fecha"]
        }
    },
    {
        name: "volkern_list_citas",
        description: "List appointments with optional filters",
        inputSchema: {
            type: "object",
            properties: {
                estado: {
                    type: "string",
                    enum: ["Pendiente", "Confirmada", "Completada", "Cancelada", "Pagada"],
                    description: "Filter by appointment status"
                },
                tipo: {
                    type: "string",
                    enum: ["reunion", "servicio", "llamada", "otro"],
                    description: "Filter by appointment type"
                },
                fecha: { type: "string", description: "Filter by specific date (YYYY-MM-DD)" },
                fechaInicio: { type: "string", description: "Start of date range (ISO 8601)" },
                fechaFin: { type: "string", description: "End of date range (ISO 8601)" }
            }
        }
    },
    {
        name: "volkern_create_cita",
        description: "Create a new appointment. Check availability first with volkern_check_disponibilidad.",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead for this appointment" },
                fechaHora: { type: "string", description: "Appointment date/time in ISO 8601 UTC (e.g., 2026-02-10T10:00:00Z)" },
                tipo: {
                    type: "string",
                    enum: ["reunion", "servicio", "llamada", "otro"],
                    description: "Appointment type (default: reunion)"
                },
                titulo: { type: "string", description: "Appointment title" },
                descripcion: { type: "string", description: "Appointment description or notes" },
                duracion: { type: "number", description: "Duration in minutes (default: 60)" },
                servicioId: { type: "string", description: "Service ID (required if tipo is 'servicio')" }
            },
            required: ["leadId", "fechaHora"]
        }
    },
    {
        name: "volkern_update_cita",
        description: "Update an existing appointment",
        inputSchema: {
            type: "object",
            properties: {
                citaId: { type: "string", description: "The appointment's unique ID" },
                fechaHora: { type: "string", description: "New date/time in ISO 8601 UTC" },
                estado: { type: "string", enum: ["Pendiente", "Confirmada", "Completada", "Cancelada"] },
                descripcion: { type: "string" },
                duracion: { type: "number" }
            },
            required: ["citaId"]
        }
    },
    {
        name: "volkern_cita_accion",
        description: "Perform an action on an appointment (confirm, cancel, or reschedule)",
        inputSchema: {
            type: "object",
            properties: {
                citaId: { type: "string", description: "The appointment's unique ID" },
                accion: {
                    type: "string",
                    enum: ["confirmar", "cancelar", "reprogramar"],
                    description: "Action to perform"
                },
                nuevaFecha: { type: "string", description: "New date/time for reschedule (ISO 8601)" },
                motivo: { type: "string", description: "Reason for cancellation" }
            },
            required: ["citaId", "accion"]
        }
    },
    // === SERVICES ===
    {
        name: "volkern_list_servicios",
        description: "List available services from the catalog",
        inputSchema: {
            type: "object",
            properties: {
                activo: { type: "boolean", description: "Filter only active services (default: true)" }
            }
        }
    },
    {
        name: "volkern_get_servicio",
        description: "Get detailed information about a specific service",
        inputSchema: {
            type: "object",
            properties: {
                servicioId: { type: "string", description: "The service's unique ID" }
            },
            required: ["servicioId"]
        }
    },
    // === TASKS ===
    {
        name: "volkern_create_task",
        description: "Create a follow-up task for a lead",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead" },
                tipo: {
                    type: "string",
                    enum: ["llamada", "email", "reunion", "recordatorio"],
                    description: "Task type"
                },
                titulo: { type: "string", description: "Task title" },
                descripcion: { type: "string", description: "Task description/context" },
                fechaVencimiento: { type: "string", description: "Due date in ISO 8601 UTC" },
                asignadoA: { type: "string", description: "User ID to assign the task to" }
            },
            required: ["leadId", "tipo", "titulo", "fechaVencimiento"]
        }
    },
    {
        name: "volkern_list_tasks",
        description: "List tasks for a specific lead",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead" }
            },
            required: ["leadId"]
        }
    },
    {
        name: "volkern_complete_task",
        description: "Mark a task as completed",
        inputSchema: {
            type: "object",
            properties: {
                taskId: { type: "string", description: "The task's unique ID" }
            },
            required: ["taskId"]
        }
    },
    // === MESSAGING ===
    {
        name: "volkern_send_whatsapp",
        description: "Send a WhatsApp message to a lead. Requires active WhatsApp integration.",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead to message" },
                mensaje: { type: "string", description: "Message content" },
                tipo: {
                    type: "string",
                    enum: ["texto", "imagen", "documento"],
                    description: "Message type (default: texto)"
                }
            },
            required: ["leadId", "mensaje"]
        }
    },
    {
        name: "volkern_list_conversaciones",
        description: "List WhatsApp conversations, optionally filtered by lead",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "Filter by lead ID" },
                page: { type: "number" },
                limit: { type: "number" }
            }
        }
    },
    // === INTERACTIONS ===
    {
        name: "volkern_list_interactions",
        description: "List all interactions for a specific lead",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead" }
            },
            required: ["leadId"]
        }
    },
    {
        name: "volkern_create_interaction",
        description: "Log an interaction (call, email, meeting) with a lead",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead" },
                tipo: {
                    type: "string",
                    enum: ["llamada", "email", "whatsapp", "reunion", "nota", "otro"],
                    description: "Interaction type"
                },
                contenido: { type: "string", description: "Interaction summary/content" },
                resultado: {
                    type: "string",
                    enum: ["positivo", "neutro", "negativo"],
                    description: "Outcome of the interaction"
                },
                metadatos: {
                    type: "object",
                    description: "Additional metadata (e.g., call duration, meeting attendees)"
                }
            },
            required: ["leadId", "tipo", "contenido"]
        }
    },
    // === NOTES ===
    {
        name: "volkern_list_notes",
        description: "List all notes for a specific lead",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead" }
            },
            required: ["leadId"]
        }
    },
    {
        name: "volkern_create_note",
        description: "Create a note for a lead",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "ID of the lead" },
                contenido: { type: "string", description: "Note content" },
                titulo: { type: "string", description: "Optional note title" }
            },
            required: ["leadId", "contenido"]
        }
    },
    // === CONTACTS / COMPANIES ===
    {
        name: "volkern_list_contacts",
        description: "List contacts (people or companies) with optional filters",
        inputSchema: {
            type: "object",
            properties: {
                tipo: {
                    type: "string",
                    enum: ["person", "company"],
                    description: "Filter by contact type (person or company)"
                },
                search: { type: "string", description: "Search by name, email, or company" },
                page: { type: "number", description: "Page number (default: 1)" },
                limit: { type: "number", description: "Results per page (default: 50)" }
            }
        }
    },
    {
        name: "volkern_get_contact",
        description: "Get detailed information about a specific contact by ID",
        inputSchema: {
            type: "object",
            properties: {
                contactId: { type: "string", description: "The contact's unique ID" }
            },
            required: ["contactId"]
        }
    },
    {
        name: "volkern_create_contact",
        description: "Create a new contact (person or company)",
        inputSchema: {
            type: "object",
            properties: {
                nombre: { type: "string", description: "Contact/company name (required)" },
                email: { type: "string", description: "Email address" },
                telefono: { type: "string", description: "Phone number" },
                tipo: {
                    type: "string",
                    enum: ["person", "company"],
                    description: "Contact type (default: person)"
                },
                cargo: { type: "string", description: "Job title (for persons)" },
                ubicacion: { type: "string", description: "Location/address" },
                companyId: { type: "string", description: "ID of parent company (for persons)" },
                linkedin: { type: "string", description: "LinkedIn profile URL" },
                notas: { type: "string", description: "Notes about the contact" },
                tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" }
            },
            required: ["nombre"]
        }
    },
    {
        name: "volkern_update_contact",
        description: "Update an existing contact's information",
        inputSchema: {
            type: "object",
            properties: {
                contactId: { type: "string", description: "The contact's unique ID" },
                nombre: { type: "string" },
                email: { type: "string" },
                telefono: { type: "string" },
                cargo: { type: "string" },
                ubicacion: { type: "string" },
                linkedin: { type: "string" },
                notas: { type: "string" },
                tags: { type: "array", items: { type: "string" } }
            },
            required: ["contactId"]
        }
    },
    // === DEALS / PIPELINE ===
    {
        name: "volkern_list_deals",
        description: "List deals/opportunities in the sales pipeline with optional filters",
        inputSchema: {
            type: "object",
            properties: {
                etapa: { type: "string", description: "Filter by pipeline stage name" },
                estado: {
                    type: "string",
                    enum: ["abierto", "ganado", "perdido"],
                    description: "Filter by deal status"
                },
                prioridad: {
                    type: "string",
                    enum: ["baja", "media", "alta"],
                    description: "Filter by priority"
                },
                search: { type: "string", description: "Search by title or contact name" },
                page: { type: "number" },
                limit: { type: "number" }
            }
        }
    },
    {
        name: "volkern_get_deal",
        description: "Get detailed information about a specific deal",
        inputSchema: {
            type: "object",
            properties: {
                dealId: { type: "string", description: "The deal's unique ID" }
            },
            required: ["dealId"]
        }
    },
    {
        name: "volkern_create_deal",
        description: "Create a new deal/opportunity in the sales pipeline",
        inputSchema: {
            type: "object",
            properties: {
                titulo: { type: "string", description: "Deal title (required)" },
                valor: { type: "number", description: "Deal value/amount" },
                moneda: { type: "string", description: "Currency code (default: EUR)" },
                etapa: { type: "string", description: "Pipeline stage name (default: Calificación)" },
                prioridad: { type: "string", enum: ["baja", "media", "alta"] },
                probabilidad: { type: "number", description: "Win probability (0-100)" },
                fechaEstimadaCierre: { type: "string", description: "Expected close date (YYYY-MM-DD)" },
                leadId: { type: "string", description: "Associated lead ID" },
                contactId: { type: "string", description: "Associated contact ID" },
                companyId: { type: "string", description: "Associated company ID" },
                descripcion: { type: "string", description: "Deal description" }
            },
            required: ["titulo"]
        }
    },
    {
        name: "volkern_update_deal",
        description: "Update an existing deal (change stage, value, status, etc.)",
        inputSchema: {
            type: "object",
            properties: {
                dealId: { type: "string", description: "The deal's unique ID" },
                titulo: { type: "string" },
                valor: { type: "number" },
                etapa: { type: "string", description: "Move to new pipeline stage" },
                estado: { type: "string", enum: ["abierto", "ganado", "perdido"] },
                prioridad: { type: "string" },
                probabilidad: { type: "number" },
                fechaEstimadaCierre: { type: "string" },
                descripcion: { type: "string" }
            },
            required: ["dealId"]
        }
    },
    {
        name: "volkern_list_pipeline_stages",
        description: "List all pipeline stages configured for the tenant",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "volkern_get_sales_forecast",
        description: "Get sales forecast and pipeline analytics",
        inputSchema: {
            type: "object",
            properties: {
                periodo: {
                    type: "string",
                    enum: ["mes", "trimestre", "año"],
                    description: "Forecast period"
                }
            }
        }
    },
    // === COTIZACIONES (QUOTES) ===
    {
        name: "volkern_list_cotizaciones",
        description: "List quotations/quotes with optional filters",
        inputSchema: {
            type: "object",
            properties: {
                estado: {
                    type: "string",
                    enum: ["borrador", "enviada", "aceptada", "rechazada", "expirada"],
                    description: "Filter by quote status"
                },
                search: { type: "string", description: "Search by number or client name" },
                page: { type: "number" },
                limit: { type: "number" }
            }
        }
    },
    {
        name: "volkern_get_cotizacion",
        description: "Get detailed information about a specific quotation",
        inputSchema: {
            type: "object",
            properties: {
                cotizacionId: { type: "string", description: "The quotation's unique ID" }
            },
            required: ["cotizacionId"]
        }
    },
    {
        name: "volkern_create_cotizacion",
        description: "Create a new quotation/quote",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "Associated lead ID" },
                dealId: { type: "string", description: "Associated deal ID" },
                validezDias: { type: "number", description: "Validity period in days (default: 30)" },
                notas: { type: "string", description: "Notes or terms" },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            concepto: { type: "string", description: "Item description" },
                            cantidad: { type: "number" },
                            precioUnitario: { type: "number" },
                            descuento: { type: "number", description: "Discount percentage" }
                        },
                        required: ["concepto", "cantidad", "precioUnitario"]
                    },
                    description: "Line items for the quote"
                }
            },
            required: ["items"]
        }
    },
    {
        name: "volkern_update_cotizacion",
        description: "Update a quotation (only if status is 'borrador')",
        inputSchema: {
            type: "object",
            properties: {
                cotizacionId: { type: "string", description: "The quotation's unique ID" },
                estado: { type: "string", enum: ["borrador", "enviada", "aceptada", "rechazada"] },
                validezDias: { type: "number" },
                notas: { type: "string" },
                items: { type: "array", description: "Updated line items" }
            },
            required: ["cotizacionId"]
        }
    },
    {
        name: "volkern_send_cotizacion",
        description: "Send a quotation to the client via email",
        inputSchema: {
            type: "object",
            properties: {
                cotizacionId: { type: "string", description: "The quotation's unique ID" },
                mensaje: { type: "string", description: "Custom message for the email" }
            },
            required: ["cotizacionId"]
        }
    },
    // === CONTRATOS (CONTRACTS) ===
    {
        name: "volkern_list_contratos",
        description: "List contracts with optional filters",
        inputSchema: {
            type: "object",
            properties: {
                estado: {
                    type: "string",
                    enum: ["borrador", "enviado", "firmado_cliente", "firmado_empresa", "activo", "completado", "cancelado"],
                    description: "Filter by contract status"
                },
                tipo: {
                    type: "string",
                    enum: ["servicios", "productos", "suscripcion", "proyecto", "otro"],
                    description: "Filter by contract type"
                },
                search: { type: "string", description: "Search by number or client name" },
                page: { type: "number" },
                limit: { type: "number" }
            }
        }
    },
    {
        name: "volkern_get_contrato",
        description: "Get detailed information about a specific contract",
        inputSchema: {
            type: "object",
            properties: {
                contratoId: { type: "string", description: "The contract's unique ID" }
            },
            required: ["contratoId"]
        }
    },
    {
        name: "volkern_create_contrato",
        description: "Create a new contract",
        inputSchema: {
            type: "object",
            properties: {
                titulo: { type: "string", description: "Contract title (required)" },
                tipo: { type: "string", enum: ["servicios", "productos", "suscripcion", "proyecto", "otro"] },
                leadId: { type: "string", description: "Associated lead ID" },
                dealId: { type: "string", description: "Associated deal ID" },
                cotizacionId: { type: "string", description: "Source quotation ID" },
                fechaInicio: { type: "string", description: "Contract start date (YYYY-MM-DD)" },
                fechaFin: { type: "string", description: "Contract end date (YYYY-MM-DD)" },
                metodoPago: { type: "string", enum: ["unico", "mensual", "trimestral", "anual"] },
                clausulas: { type: "string", description: "Contract terms and conditions" },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            concepto: { type: "string" },
                            cantidad: { type: "number" },
                            precioUnitario: { type: "number" }
                        }
                    }
                }
            },
            required: ["titulo"]
        }
    },
    {
        name: "volkern_create_contrato_from_cotizacion",
        description: "Create a contract from an accepted quotation",
        inputSchema: {
            type: "object",
            properties: {
                cotizacionId: { type: "string", description: "The accepted quotation's ID" },
                fechaInicio: { type: "string", description: "Contract start date" },
                fechaFin: { type: "string", description: "Contract end date" },
                metodoPago: { type: "string", enum: ["unico", "mensual", "trimestral", "anual"] },
                clausulas: { type: "string", description: "Additional contract terms" }
            },
            required: ["cotizacionId"]
        }
    },
    {
        name: "volkern_send_contrato",
        description: "Send a contract to the client for signature",
        inputSchema: {
            type: "object",
            properties: {
                contratoId: { type: "string", description: "The contract's unique ID" },
                mensaje: { type: "string", description: "Custom message for the email" }
            },
            required: ["contratoId"]
        }
    },
    // === CATÁLOGO (FASE 4 - INTEGRACIÓN COMPLETA) ===
    {
        name: "volkern_catalog_suggestions",
        description: "Quick search for catalog items to use in quotes, contracts, and orders. Returns suggestions formatted for auto-complete.",
        inputSchema: {
            type: "object",
            properties: {
                q: { type: "string", description: "Search query (name, SKU, or description)" },
                tipo: { type: "string", enum: ["producto", "servicio"], description: "Filter by item type" },
                limit: { type: "number", description: "Max results (default: 10, max: 50)" }
            }
        }
    },
    {
        name: "volkern_list_catalogo",
        description: "List catalog items with filters. Supports Phase 1 fields: customFields, categories, tags, media, pricing.",
        inputSchema: {
            type: "object",
            properties: {
                tipo: { type: "string", enum: ["producto", "servicio"], description: "Filter by type" },
                categoria: { type: "string", description: "Filter by category (exact or partial match)" },
                etiqueta: { type: "string", description: "Filter by tag" },
                search: { type: "string", description: "Search by name, SKU, description" },
                activo: { type: "boolean", description: "Filter by active status (default: true)" },
                page: { type: "number" },
                limit: { type: "number" }
            }
        }
    },
    {
        name: "volkern_get_catalogo_item",
        description: "Get full details of a catalog item including Phase 1 fields (customFields, categories, tags, media, pricing)",
        inputSchema: {
            type: "object",
            properties: {
                itemId: { type: "string", description: "The catalog item's unique ID" }
            },
            required: ["itemId"]
        }
    },
    {
        name: "volkern_create_cotizacion_from_catalog",
        description: "Create a quotation pre-populated from catalog items. Inherits pricing, taxes, and custom fields. Applies volume discounts if configured.",
        inputSchema: {
            type: "object",
            properties: {
                titulo: { type: "string", description: "Quote title (required)" },
                descripcion: { type: "string", description: "Quote description" },
                leadId: { type: "string", description: "Associated lead ID" },
                dealId: { type: "string", description: "Associated deal ID" },
                catalogItems: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            catalogoItemId: { type: "string", description: "Catalog item ID (required)" },
                            cantidad: { type: "number", description: "Quantity (required)" },
                            descuento: { type: "number", description: "Line item discount %" },
                            precioOverride: { type: "number", description: "Override catalog price" },
                            descripcionOverride: { type: "string", description: "Override catalog description" }
                        },
                        required: ["catalogoItemId", "cantidad"]
                    },
                    description: "Array of catalog items to include"
                },
                descuentoPorcentaje: { type: "number", description: "Global discount %" },
                moneda: { type: "string", description: "Currency (default from catalog)" },
                validezDias: { type: "number", description: "Validity days (default: 30)" },
                terminosPago: { type: "string", description: "Payment terms" },
                notasCliente: { type: "string", description: "Notes for client" },
                clienteNombre: { type: "string" },
                clienteEmail: { type: "string" },
                clienteEmpresa: { type: "string" },
                clienteTelefono: { type: "string" },
                emisorId: { type: "string", description: "Fiscal issuer ID" }
            },
            required: ["titulo", "catalogItems"]
        }
    },
    {
        name: "volkern_create_orden_from_cotizacion",
        description: "Convert an accepted quotation into a sales order. Inherits all items, client data, and catalog references.",
        inputSchema: {
            type: "object",
            properties: {
                cotizacionId: { type: "string", description: "The quotation's unique ID (required)" },
                fechaEntrega: { type: "string", description: "Expected delivery date (YYYY-MM-DD)" },
                notas: { type: "string", description: "Order notes" },
                notasInternas: { type: "string", description: "Internal notes" },
                condicionesVenta: { type: "string", description: "Sales terms" },
                referenciaCliente: { type: "string", description: "Client reference/PO number" },
                ajustarPrecios: { type: "boolean", description: "Update prices from current catalog values (default: false)" }
            },
            required: ["cotizacionId"]
        }
    },
    // === ÓRDENES DE VENTA (SALES ORDERS) ===
    {
        name: "volkern_list_ordenes",
        description: "List sales orders with optional filters",
        inputSchema: {
            type: "object",
            properties: {
                estado: {
                    type: "string",
                    enum: ["borrador", "confirmada", "en_proceso", "completada", "cancelada"],
                    description: "Filter by order status"
                },
                leadId: { type: "string", description: "Filter by lead ID" },
                contactId: { type: "string", description: "Filter by contact ID" },
                contratoId: { type: "string", description: "Filter by contract ID" },
                dealId: { type: "string", description: "Filter by deal ID" },
                fechaDesde: { type: "string", description: "Start date filter (YYYY-MM-DD)" },
                fechaHasta: { type: "string", description: "End date filter (YYYY-MM-DD)" },
                search: { type: "string", description: "Search by order number or reference" },
                page: { type: "number" },
                limit: { type: "number" }
            }
        }
    },
    {
        name: "volkern_get_orden",
        description: "Get detailed information about a specific sales order including items with catalog references",
        inputSchema: {
            type: "object",
            properties: {
                ordenId: { type: "string", description: "The sales order's unique ID" }
            },
            required: ["ordenId"]
        }
    },
    {
        name: "volkern_create_orden",
        description: "Create a new sales order directly (without quotation). Use volkern_create_orden_from_cotizacion for conversion.",
        inputSchema: {
            type: "object",
            properties: {
                leadId: { type: "string", description: "Lead ID (required if no contactId)" },
                contactId: { type: "string", description: "Contact ID (required if no leadId)" },
                dealId: { type: "string", description: "Associated deal ID" },
                contratoId: { type: "string", description: "Associated contract ID" },
                emisorId: { type: "string", description: "Fiscal issuer ID" },
                fechaOrden: { type: "string", description: "Order date (YYYY-MM-DD)" },
                fechaEntrega: { type: "string", description: "Delivery date (YYYY-MM-DD)" },
                moneda: { type: "string", description: "Currency (default: EUR)" },
                descuentoGlobal: { type: "number", description: "Global discount (% or fixed)" },
                tipoDescuento: { type: "string", enum: ["porcentaje", "fijo"] },
                notas: { type: "string" },
                notasInternas: { type: "string" },
                condicionesVenta: { type: "string" },
                referenciaCliente: { type: "string" },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            concepto: { type: "string" },
                            descripcion: { type: "string" },
                            cantidad: { type: "number" },
                            unidad: { type: "string" },
                            precioUnitario: { type: "number" },
                            descuento: { type: "number" },
                            tasaImpuestoId: { type: "string" },
                            porcentajeImpuesto: { type: "number" },
                            aplicaRetencion: { type: "boolean" },
                            porcentajeRetencion: { type: "number" },
                            catalogoItemId: { type: "string", description: "Link to catalog item" }
                        },
                        required: ["concepto", "cantidad", "precioUnitario"]
                    },
                    description: "Order line items"
                }
            },
            required: ["items"]
        }
    }
];
// ============================================
// Tool Handlers
// ============================================
async function handleToolCall(name, args) {
    switch (name) {
        // LEADS
        case "volkern_list_leads": {
            const params = new URLSearchParams();
            if (args.estado)
                params.append("estado", String(args.estado));
            if (args.canal)
                params.append("canal", String(args.canal));
            if (args.search)
                params.append("search", String(args.search));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/leads?${params.toString()}`);
        }
        case "volkern_get_lead":
            return volkernRequest(`/leads/${args.leadId}`);
        case "volkern_create_lead":
            return volkernRequest("/leads", "POST", args);
        case "volkern_update_lead": {
            const { leadId, ...data } = args;
            return volkernRequest(`/leads/${leadId}`, "PATCH", data);
        }
        // APPOINTMENTS
        case "volkern_check_disponibilidad": {
            const params = new URLSearchParams();
            params.append("fecha", String(args.fecha));
            if (args.duracion)
                params.append("duracion", String(args.duracion));
            return volkernRequest(`/citas/disponibilidad?${params.toString()}`);
        }
        case "volkern_list_citas": {
            const params = new URLSearchParams();
            if (args.estado)
                params.append("estado", String(args.estado));
            if (args.tipo)
                params.append("tipo", String(args.tipo));
            if (args.fecha)
                params.append("fecha", String(args.fecha));
            if (args.fechaInicio)
                params.append("fechaInicio", String(args.fechaInicio));
            if (args.fechaFin)
                params.append("fechaFin", String(args.fechaFin));
            return volkernRequest(`/citas?${params.toString()}`);
        }
        case "volkern_create_cita":
            return volkernRequest("/citas", "POST", args);
        case "volkern_update_cita": {
            const { citaId, ...data } = args;
            return volkernRequest(`/citas/${citaId}`, "PATCH", data);
        }
        case "volkern_cita_accion":
            return volkernRequest("/citas/accion", "POST", args);
        // SERVICES
        case "volkern_list_servicios": {
            const params = new URLSearchParams();
            if (args.activo !== undefined)
                params.append("activo", String(args.activo));
            return volkernRequest(`/servicios?${params.toString()}`);
        }
        case "volkern_get_servicio":
            return volkernRequest(`/servicios/${args.servicioId}`);
        // TASKS
        case "volkern_create_task": {
            const { leadId, ...taskData } = args;
            return volkernRequest(`/leads/${leadId}/tasks`, "POST", taskData);
        }
        case "volkern_list_tasks":
            return volkernRequest(`/leads/${args.leadId}/tasks`);
        case "volkern_complete_task":
            return volkernRequest(`/tasks/${args.taskId}`, "PATCH", { completada: true });
        // MESSAGING
        case "volkern_send_whatsapp":
            return volkernRequest("/mensajes/enviar", "POST", args);
        case "volkern_list_conversaciones": {
            const params = new URLSearchParams();
            if (args.leadId)
                params.append("leadId", String(args.leadId));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/mensajes/conversaciones?${params.toString()}`);
        }
        // INTERACTIONS
        case "volkern_list_interactions":
            return volkernRequest(`/leads/${args.leadId}/interactions`);
        case "volkern_create_interaction": {
            const { leadId, ...interactionData } = args;
            return volkernRequest(`/leads/${leadId}/interactions`, "POST", interactionData);
        }
        // NOTES
        case "volkern_list_notes":
            return volkernRequest(`/leads/${args.leadId}/notes`);
        case "volkern_create_note": {
            const { leadId: noteLeadId, ...noteData } = args;
            return volkernRequest(`/leads/${noteLeadId}/notes`, "POST", noteData);
        }
        // CONTACTS / COMPANIES
        case "volkern_list_contacts": {
            const params = new URLSearchParams();
            if (args.tipo)
                params.append("tipo", String(args.tipo));
            if (args.search)
                params.append("search", String(args.search));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/contacts?${params.toString()}`);
        }
        case "volkern_get_contact":
            return volkernRequest(`/contacts/${args.contactId}`);
        case "volkern_create_contact":
            return volkernRequest("/contacts", "POST", args);
        case "volkern_update_contact": {
            const { contactId, ...contactData } = args;
            return volkernRequest(`/contacts/${contactId}`, "PATCH", contactData);
        }
        // DEALS / PIPELINE
        case "volkern_list_deals": {
            const params = new URLSearchParams();
            if (args.etapa)
                params.append("etapa", String(args.etapa));
            if (args.estado)
                params.append("estado", String(args.estado));
            if (args.prioridad)
                params.append("prioridad", String(args.prioridad));
            if (args.search)
                params.append("search", String(args.search));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/deals?${params.toString()}`);
        }
        case "volkern_get_deal":
            return volkernRequest(`/deals/${args.dealId}`);
        case "volkern_create_deal":
            return volkernRequest("/deals", "POST", args);
        case "volkern_update_deal": {
            const { dealId, ...dealData } = args;
            return volkernRequest(`/deals/${dealId}`, "PATCH", dealData);
        }
        case "volkern_list_pipeline_stages":
            return volkernRequest("/pipeline/stages");
        case "volkern_get_sales_forecast": {
            const params = new URLSearchParams();
            if (args.periodo)
                params.append("periodo", String(args.periodo));
            return volkernRequest(`/deals/forecast?${params.toString()}`);
        }
        // COTIZACIONES (QUOTES)
        case "volkern_list_cotizaciones": {
            const params = new URLSearchParams();
            if (args.estado)
                params.append("estado", String(args.estado));
            if (args.search)
                params.append("search", String(args.search));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/cotizaciones?${params.toString()}`);
        }
        case "volkern_get_cotizacion":
            return volkernRequest(`/cotizaciones/${args.cotizacionId}`);
        case "volkern_create_cotizacion":
            return volkernRequest("/cotizaciones", "POST", args);
        case "volkern_update_cotizacion": {
            const { cotizacionId, ...cotizacionData } = args;
            return volkernRequest(`/cotizaciones/${cotizacionId}`, "PATCH", cotizacionData);
        }
        case "volkern_send_cotizacion":
            return volkernRequest(`/cotizaciones/${args.cotizacionId}/send`, "POST", { mensaje: args.mensaje });
        // CONTRATOS (CONTRACTS)
        case "volkern_list_contratos": {
            const params = new URLSearchParams();
            if (args.estado)
                params.append("estado", String(args.estado));
            if (args.tipo)
                params.append("tipo", String(args.tipo));
            if (args.search)
                params.append("search", String(args.search));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/contratos?${params.toString()}`);
        }
        case "volkern_get_contrato":
            return volkernRequest(`/contratos/${args.contratoId}`);
        case "volkern_create_contrato":
            return volkernRequest("/contratos", "POST", args);
        case "volkern_create_contrato_from_cotizacion":
            return volkernRequest("/contratos/from-cotizacion", "POST", args);
        case "volkern_send_contrato":
            return volkernRequest(`/contratos/${args.contratoId}/send`, "POST", { mensaje: args.mensaje });
        // CATÁLOGO (FASE 4)
        case "volkern_catalog_suggestions": {
            const params = new URLSearchParams();
            if (args.q)
                params.append("q", String(args.q));
            if (args.tipo)
                params.append("tipo", String(args.tipo));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/catalogo/suggestions?${params.toString()}`);
        }
        case "volkern_list_catalogo": {
            const params = new URLSearchParams();
            if (args.tipo)
                params.append("tipo", String(args.tipo));
            if (args.categoria)
                params.append("categoria", String(args.categoria));
            if (args.etiqueta)
                params.append("etiqueta", String(args.etiqueta));
            if (args.search)
                params.append("search", String(args.search));
            if (args.activo !== undefined)
                params.append("activo", String(args.activo));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/catalogo?${params.toString()}`);
        }
        case "volkern_get_catalogo_item":
            return volkernRequest(`/catalogo/${args.itemId}`);
        case "volkern_create_cotizacion_from_catalog":
            return volkernRequest("/cotizaciones/from-catalog", "POST", args);
        case "volkern_create_orden_from_cotizacion":
            return volkernRequest("/ordenes-venta/from-cotizacion", "POST", args);
        // ÓRDENES DE VENTA
        case "volkern_list_ordenes": {
            const params = new URLSearchParams();
            if (args.estado)
                params.append("estado", String(args.estado));
            if (args.leadId)
                params.append("leadId", String(args.leadId));
            if (args.contactId)
                params.append("contactId", String(args.contactId));
            if (args.contratoId)
                params.append("contratoId", String(args.contratoId));
            if (args.dealId)
                params.append("dealId", String(args.dealId));
            if (args.fechaDesde)
                params.append("fechaDesde", String(args.fechaDesde));
            if (args.fechaHasta)
                params.append("fechaHasta", String(args.fechaHasta));
            if (args.search)
                params.append("search", String(args.search));
            if (args.page)
                params.append("page", String(args.page));
            if (args.limit)
                params.append("limit", String(args.limit));
            return volkernRequest(`/ordenes-venta?${params.toString()}`);
        }
        case "volkern_get_orden":
            return volkernRequest(`/ordenes-venta/${args.ordenId}`);
        case "volkern_create_orden":
            return volkernRequest("/ordenes-venta", "POST", args);
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
// ============================================
// Server Setup
// ============================================
const server = new Server({
    name: "volkern-mcp-server",
    version: "1.3.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        const result = await handleToolCall(name, args);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Volkern MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
