"use client";

import { useState, useEffect } from "react";
import { VolkernClient } from "@/lib/volkern-client";
import { Service, AvailabilityResponse } from "@/types/volkern";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DateTimePickerProps {
    service: Service;
    onSelect: (dateTime: string) => void;
    onBack: () => void;
}

export default function DateTimePicker({ service, onSelect, onBack }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        VolkernClient.getAvailability(selectedDate, service.duracionMinutos)
            .then(setAvailability)
            .finally(() => setLoading(false));
    }, [selectedDate, service.duracionMinutos]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

    // Simple calendar logic for the current month
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() + i);
        return d.toISOString().split('T')[0];
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
                    <h2 className="text-2xl font-bold">Selecciona fecha y hora</h2>
                    <p className="text-slate-500">Disponibilidad para {service.nombre}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Date Picker (Simple horizontal scroll for now) */}
                <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Fecha</label>
                    <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
                        {dates.map((date) => {
                            const d = new Date(date + 'T00:00:00');
                            const isSelected = selectedDate === date;
                            return (
                                <button
                                    key={date}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border transition-all duration-300",
                                        isSelected
                                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
                                    )}
                                >
                                    <span className="text-[10px] uppercase font-bold opacity-60">
                                        {d.toLocaleDateString('es', { weekday: 'short' })}
                                    </span>
                                    <span className="text-xl font-bold">
                                        {d.getDate()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Horarios Disponibles</label>

                    {loading ? (
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : availability?.disponibles.slots.length === 0 ? (
                        <div className="p-8 text-center glass rounded-2xl">
                            <p className="text-slate-500">No hay horarios disponibles para este día.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {availability?.disponibles.slots.map((slot) => {
                                const time = new Date(slot).toLocaleTimeString('es', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                });
                                return (
                                    <button
                                        key={slot}
                                        onClick={() => onSelect(slot)}
                                        className="p-3 text-sm font-semibold rounded-xl border border-slate-200 hover:border-primary hover:text-primary transition-all bg-white"
                                    >
                                        {time}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
