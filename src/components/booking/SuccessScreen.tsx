"use client";

import { CheckCircle2, Calendar, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface SuccessScreenProps {
    clientName: string;
    serviceName: string;
    dateTime: string;
}

export default function SuccessScreen({ clientName, serviceName, dateTime }: SuccessScreenProps) {
    const formattedDate = new Date(dateTime).toLocaleString('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="flex flex-col items-center justify-center text-center py-10 space-y-8 animate-fade-in">
            <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/20">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
            </motion.div>

            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">¡Cita agendada con éxito!</h2>
                <p className="text-slate-500 text-lg">Gracias ${clientName}, tu sesión para ${serviceName} ha sido reservada.</p>
            </div>

            <div className="glass p-8 rounded-3xl w-full max-w-sm space-y-4">
                <div className="flex items-center space-x-3 text-left">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora</p>
                        <p className="font-semibold">{formattedDate}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                <p className="text-sm text-slate-400 max-w-xs">
                    Hemos enviado un correo de confirmación con todos los detalles a tu bandeja de entrada.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-primary font-bold inline-flex items-center hover:underline"
                >
                    Agendar otra cita <ArrowRight className="w-4 h-4 ml-1" />
                </button>
            </div>
        </div>
    );
}
