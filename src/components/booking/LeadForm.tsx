"use client";

import { useForm } from "react-hook-form";
import { Service, Lead } from "@/types/volkern";
import { User, Mail, Phone, Building, MessageSquare, ArrowRight, ChevronLeft, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { parseSlotInTenantTimezone } from "@/lib/time-utils";

interface LeadFormProps {
    service: Service;
    dateTime: string;
    onSubmit: (data: Lead) => void;
    onBack: () => void;
}

interface FormErrors {
    nombre?: string;
    email?: string;
    telefono?: string;
}

export default function LeadForm({ service, dateTime, onSubmit, onBack }: LeadFormProps) {
    const { register, handleSubmit, formState: { errors }, watch } = useForm<Lead>({
        mode: 'onTouched'
    });

    // Track touched fields to show warnings only after interaction
    const watchedFields = watch();

    const getFieldWarning = (fieldName: keyof FormErrors): string | null => {
        const error = errors[fieldName];
        if (!error) return null;

        if (fieldName === 'nombre') return 'Por favor, ingresa tu nombre';
        if (fieldName === 'email') {
            if (error.type === 'required') return 'Por favor, ingresa tu email';
            return 'Por favor, ingresa un email válido';
        }
        if (fieldName === 'telefono') return 'Por favor, ingresa tu teléfono';
        return null;
    };

    const tenantTz = process.env.NEXT_PUBLIC_TENANT_TIMEZONE || 'Europe/Madrid';
    const parsedDate = parseSlotInTenantTimezone(dateTime, tenantTz);
    const formattedDate = parsedDate.toLocaleString('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center space-x-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold">Tus datos</h2>
                    <p className="text-slate-500">Casi listo para tu cita el {formattedDate}</p>
                </div>
            </div>

            {/* Required fields notice */}
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <span>Los campos marcados con * son obligatorios</span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Nombre Completo *</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                {...register("nombre", { required: true })}
                                className={`w-full pl-12 pr-4 py-3 bg-white border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                                    errors.nombre ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                                }`}
                                placeholder="Juan Pérez"
                            />
                        </div>
                        {getFieldWarning('nombre') && (
                            <span className="text-xs text-amber-600 ml-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {getFieldWarning('nombre')}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Email *</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                {...register("email", {
                                    required: true,
                                    pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
                                })}
                                type="email"
                                className={`w-full pl-12 pr-4 py-3 bg-white border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                                    errors.email ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                                }`}
                                placeholder="juan@ejemplo.com"
                            />
                        </div>
                        {getFieldWarning('email') && (
                            <span className="text-xs text-amber-600 ml-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {getFieldWarning('email')}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Teléfono *</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                {...register("telefono", {
                                    required: true,
                                    pattern: /^[\d\s+()-]{7,}$/
                                })}
                                type="tel"
                                className={`w-full pl-12 pr-4 py-3 bg-white border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                                    errors.telefono ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                                }`}
                                placeholder="+34 612 345 678"
                            />
                        </div>
                        {getFieldWarning('telefono') && (
                            <span className="text-xs text-amber-600 ml-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {getFieldWarning('telefono')}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Empresa</label>
                        <div className="relative">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                {...register("empresa")}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Mi Empresa S.A."
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1">¿Cómo podemos ayudarte? (Notas)</label>
                    <div className="relative">
                        <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <textarea
                            {...register("notas")}
                            rows={4}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            placeholder="Cuéntanos un poco sobre tu proyecto..."
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all group"
                >
                    Confirmar Reserva <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            </form>
        </div>
    );
}
