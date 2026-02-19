"use client";

import { useState } from "react";
import ServiceSelection from "@/components/booking/ServiceSelection";
import DateTimePicker from "@/components/booking/DateTimePicker";
import LeadForm from "@/components/booking/LeadForm";
import SuccessScreen from "@/components/booking/SuccessScreen";
import { Service, Lead, Appointment } from "@/types/volkern";
import { VolkernClient } from "@/lib/volkern-client";
import { EmailService } from "@/lib/email-service";
import { motion, AnimatePresence } from "framer-motion";

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");
  const [clientData, setClientData] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleDateTimeSelect = (dateTime: string) => {
    setSelectedDateTime(dateTime);
    setStep(3);
  };

  const handleFormSubmit = async (data: Lead) => {
    if (!selectedService || !selectedDateTime) return;

    setClientData(data);
    setIsSubmitting(true);

    try {
      // 1. Create/Update Lead in Volkern
      const lead = await VolkernClient.upsertLead({
        ...data,
        canal: 'web',
        // contextoProyecto removed to keep lead clean as per user request
      });

      if (!lead.id) throw new Error("Could not result lead ID from CRM");

      // 2. Create Appointment in Volkern
      await VolkernClient.createAppointment({
        leadId: lead.id,
        fechaHora: selectedDateTime,
        tipo: 'reunion',
        titulo: `Cita: ${selectedService.nombre} - ${data.nombre}`,
        descripcion: data.notas,
        duracion: selectedService.duracionMinutos,
        servicioId: selectedService.id
      });

      // 3. Send Emails (Fire and forget or wait depends on preference, here we wait)
      await EmailService.sendBookingConfirmation(data.email, data.nombre, {
        serviceName: selectedService.nombre,
        dateTime: selectedDateTime,
        duration: selectedService.duracionMinutos
      }).catch(err => console.error("Email sending failed:", err));

      setStep(4);
    } catch (error: any) {
      console.error("Booking process failed:", error);
      alert(`Error al procesar reserva (v1.2.10): ${error.message || "Error desconocido"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10 px-4 relative">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-lg">Confirmando tu reserva...</p>
        </div>
      )}

      {/* Header / Stepper */}
      {step < 4 && (
        <div className="mb-12 flex justify-center space-x-12 relative">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${step >= i ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-white border border-slate-200 text-slate-400"
                  }`}
              >
                <span className="text-xs font-bold">{i}</span>
              </div>
              <span className={`text-[10px] mt-2 font-medium uppercase tracking-wider ${step >= i ? "text-primary" : "text-slate-400"
                }`}>
                {i === 1 && "Servicio"}
                {i === 2 && "Fecha"}
                {i === 3 && "Datos"}
              </span>
            </div>
          ))}
          {/* Progress Line */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-[160px] h-[2px] bg-slate-200 -z-0">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ServiceSelection onSelect={handleServiceSelect} />
          </motion.div>
        )}

        {step === 2 && selectedService && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DateTimePicker
              service={selectedService}
              onSelect={handleDateTimeSelect}
              onBack={() => setStep(1)}
            />
          </motion.div>
        )}

        {step === 3 && selectedService && selectedDateTime && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <LeadForm
              service={selectedService}
              dateTime={selectedDateTime}
              onSubmit={handleFormSubmit}
              onBack={() => setStep(2)}
            />
          </motion.div>
        )}

        {step === 4 && clientData && selectedService && selectedDateTime && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <SuccessScreen
              clientName={clientData.nombre}
              serviceName={selectedService.nombre}
              dateTime={selectedDateTime}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
