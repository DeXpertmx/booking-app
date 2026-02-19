"use client";

import { useForm } from "react-hook-form";
import { Service, Lead } from "@/types/volkern";
import { User, Mail, Phone, Building, MessageSquare, ArrowRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

interface LeadFormProps {
    service: Service;
    dateTime: string;
    onSubmit: (data: Lead) => void;
    onBack: () => void;
}

export default function LeadForm({ service, dateTime, onSubmit, onBack }: LeadFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm<Lead>();

    const formattedDate = new Date(dateTime).toLocaleString('es', {
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Nombre Completo *</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                {...register("nombre", { required: true })}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Juan Pérez"
                            />
                        </div>
                        {errors.nombre && <span className="text-xs text-red-500 ml-1">Este campo es obligatorio</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Email *</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="juan@ejemplo.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Teléfono</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                {...register("telefono")}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="+52 55 1234 5678"
                            />
                        </div>
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
