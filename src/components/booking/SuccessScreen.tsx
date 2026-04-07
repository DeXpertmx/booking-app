"use client";

import { CheckCircle2, Calendar, Clock, ArrowRight, Globe } from "lucide-react";
import { motion } from "framer-motion";

interface SuccessScreenProps {
    clientName: string;
    serviceName: string;
    dateTime: string;
    userTimezone?: string;
}

export default function SuccessScreen({ clientName, serviceName, dateTime, userTimezone }: SuccessScreenProps) {
    const tenantTz = process.env.NEXT_PUBLIC_TENANT_TIMEZONE || 'Europe/Madrid';
    const userTz = userTimezone || tenantTz;
    const appointmentDate = new Date(dateTime);
    const isDifferentTimezone = userTz !== tenantTz;

    // Format in tenant timezone (Málaga/España)
    const tenantFormattedDate = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tenantTz
    }).format(appointmentDate);

    // Format in user's timezone
    const userFormattedDate = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: userTz
    }).format(appointmentDate);

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
                <p className="text-slate-500 text-lg">Gracias {clientName}, tu sesión para {serviceName} ha sido reservada.</p>
            </div>

            <div className="glass p-8 rounded-3xl w-full max-w-md space-y-4">
                {isDifferentTimezone ? (
                    <>
                        <div className="flex items-center space-x-3 text-left">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Globe className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tu hora local</p>
                                <p className="font-semibold text-primary">{userFormattedDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 text-left pt-2 border-t border-slate-200">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hora en España (Málaga)</p>
                                <p className="font-medium text-slate-600">{tenantFormattedDate}</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center space-x-3 text-left">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora</p>
                            <p className="font-semibold">{tenantFormattedDate}</p>
                        </div>
                    </div>
                )}
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
