"use client";

import { useEffect, useState } from "react";
import { VolkernClient } from "@/lib/volkern-client";
import { Service } from "@/types/volkern";
import { Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ServiceSelectionProps {
    onSelect: (service: Service) => void;
}

export default function ServiceSelection({ onSelect }: ServiceSelectionProps) {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        VolkernClient.getServices()
            .then((data) => {
                console.log("Services received:", data);
                if (Array.isArray(data)) {
                    setServices(data);
                } else if (data && typeof data === 'object' && 'services' in data && Array.isArray((data as any).services)) {
                    // Handle case where API might wrap list in a 'services' property
                    setServices((data as any).services);
                } else {
                    console.error("Data received is not an array:", data);
                    setError("El formato de respuesta de la API no es válido.");
                    setServices([]);
                }
            })
            .catch((err) => {
                console.error("Error fetching services:", err);
                setError("No se pudieron cargar los servicios. Por favor intenta de nuevo.");
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 animate-pulse">Cargando servicios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center glass rounded-2xl space-y-4">
                <p className="text-red-500 font-medium">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-primary font-bold hover:underline"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Elige un servicio</h2>
                <p className="text-slate-500">Selecciona la opción que mejor se adapte a tus necesidades</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(services) && services.length > 0 ? (
                    services.map((service, index) => (
                        <motion.button
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onSelect(service)}
                            className="group glass p-6 rounded-2xl text-left hover:border-primary/50 transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>

                            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                                {service.nombre}
                            </h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                                {service.descripcion}
                            </p>

                            <div className="flex items-center space-x-4 text-xs font-medium text-slate-400">
                                <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {service.duracionMinutos} min
                                </div>
                                <div className="flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {service.modalidad}
                                </div>
                            </div>

                            <div className="mt-6 flex items-center text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
                                Seleccionar <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </motion.button>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center glass rounded-2xl">
                        <p className="text-slate-500">No hay servicios disponibles en este momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
