"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const priceByVisa: Record<"estudio" | "nomada" | "trabajo" | "general", number> = {
  estudio: 25, // in EUR e.g., €59.00
  nomada: 25,
  trabajo: 25,
  general: 25,
};

const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  invitados: z.string().optional(),
  comment: z.string().optional(),
  phone: z.string().min(6, "Número inválido"),
  price: z.number().min(1),
});

type FormValues = z.infer<typeof schema>;

export function FormMessage({ 
  visaType, 
  presetComment, 
  customPrice, 
  selectedDate, 
  selectedTime,
  selectedSlotId
}: { 
  visaType: "estudio" | "nomada" | "trabajo" | "general"; 
  presetComment?: string; 
  customPrice?: number;
  selectedDate?: string | null;
  selectedTime?: string | null;
  selectedSlotId?: string | null;
}) {
  const priceCents = useMemo(() => customPrice || priceByVisa[visaType], [visaType, customPrice]);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { 
      comment: presetComment && presetComment.length < 200 ? presetComment : "", 
      price: priceCents 
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    console.log("=== ONSUBMIT EJECUTADO ===");
    console.log("Datos del formulario:", data);
    console.log("Estado submitting antes:", submitting);
    
    setSubmitting(true);
    console.log("setSubmitting(true) ejecutado");
    
    try {
      console.log("Iniciando proceso de pago...", { data, visaType, priceCents });
      
      // Crear booking temporal antes del pago
      let bookingId = null;
      if (selectedSlotId) {
        try {
          const bookingResponse = await fetch("/api/booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slotId: selectedSlotId,
              customerData: {
                name: data.name,
                email: data.email,
                phone: data.phone
              },
              visaType: visaType
            })
          });

          if (bookingResponse.ok) {
            const bookingResult = await bookingResponse.json();
            bookingId = bookingResult.bookingId;
            console.log("✅ Booking temporal creado:", bookingId);
          } else {
            console.error("❌ Error creando booking temporal");
            const errorData = await bookingResponse.json();
            throw new Error(errorData.error || "Error creando reserva");
          }
        } catch (bookingError) {
          console.error("❌ Error en booking:", bookingError);
          throw new Error("No se pudo reservar el horario seleccionado. Inténtalo de nuevo.");
        }
      }

      // Persist lead (best-effort). Ignore failure for UX.
      try {
        await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
          ...data, 
          visa_type: visaType,
          invitados: data.invitados ? parseInt(data.invitados, 10) : undefined,
          selected_date: selectedDate,
          selected_time: selectedTime,
          booking_id: bookingId
        }),
        });
        console.log("Lead guardado exitosamente");
      } catch (error) {
        console.warn("Error al guardar lead:", error);
      }

      console.log("Creando sesión de Stripe...");
      const res = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visa_type: visaType,
          price_cents: priceCents * 100, // Convert EUR to cents for Stripe
          name: data.name,
          email: data.email,
          phone: data.phone,
          invitados: data.invitados ? parseInt(data.invitados, 10) : undefined,
          comment: data.comment,
          selected_date: selectedDate,
          selected_time: selectedTime,
        }),
      });

      console.log("Respuesta de Stripe:", res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error en la respuesta de Stripe:", errorText);
        alert(`Error al crear la sesión de pago: ${res.status} - ${errorText}`);
        return;
      }

      const response = await res.json();
      console.log("Respuesta JSON de Stripe:", response);
      
      if (response.url) {
        console.log("Redirigiendo a Stripe:", response.url);
        window.location.href = response.url;
      } else {
        console.error("No se recibió URL de Stripe:", response);
        alert("Error: No se recibió la URL de pago de Stripe");
      }
    } catch (error) {
      console.error("Error en el proceso de pago:", error);
      alert(`Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const priceFormatted = useMemo(() => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(priceCents), [priceCents]);

  return (
    <div 
      id={`form-${visaType}`}
      data-form-id={`form-${visaType}`}
      className="w-full px-2 sm:px-4 py-4 sm:py-6 max-h-[70vh] overflow-y-auto border-2 border-gray-200 rounded-lg bg-white shadow-sm"
    >
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-black mb-3">📋 Formulario</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {visaType === "general" ? "🤔 Consulta General" : `✅ Visa de ${visaType.charAt(0).toUpperCase() + visaType.slice(1)}`}
          </div>
          {selectedDate && selectedTime && (
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              📅 {new Date(selectedDate).toLocaleDateString('es-ES')} - {selectedTime}
            </div>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs sm:text-sm text-blue-800">
            <strong>Importante:</strong> Completa los campos obligatorios (*) para proceder.
          </p>
        </div>
      </div>

      <form 
        onSubmit={(e) => {
          console.log("=== FORM SUBMIT EVENT ===");
          console.log("Event:", e);
          console.log("PreventDefault ejecutado:", e.defaultPrevented);
          handleSubmit(onSubmit)(e);
        }} 
        className="space-y-4"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-red-500">*</span>
              <span>Nombre completo</span>
            </label>
            <input 
              placeholder="María García López" 
              {...register("name")} 
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-sm sm:text-base" 
            />
            {errors.name && <span className="text-red-600 text-xs sm:text-sm mt-1 flex items-center gap-1">
              <span>⚠️</span>
              {errors.name.message}
            </span>}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-red-500">*</span>
              <span>Email</span>
            </label>
            <input 
              placeholder="maria@email.com" 
              type="email" 
              {...register("email")} 
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-sm sm:text-base" 
            />
            {errors.email && <span className="text-red-600 text-xs sm:text-sm mt-1 flex items-center gap-1">
              <span>⚠️</span>
              {errors.email.message}
            </span>}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-red-500">*</span>
              <span>Teléfono</span>
            </label>
            <input 
              placeholder="+34 612 345 678" 
              {...register("phone")} 
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-sm sm:text-base" 
            />
            {errors.phone && <span className="text-red-600 text-xs sm:text-sm mt-1 flex items-center gap-1">
              <span>⚠️</span>
              {errors.phone.message}
            </span>}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-gray-400">*</span>
              <span>Invitados</span>
              <span className="text-xs text-gray-500 font-normal">(opcional)</span>
            </label>
            <input 
              placeholder="Número de acompañantes" 
              {...register("invitados")} 
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-sm sm:text-base" 
            />
            <p className="text-xs text-gray-500 mt-1">Si vienes acompañado</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-gray-400">*</span>
            <span>Comentarios</span>
            <span className="text-xs text-gray-500 font-normal">(opcional)</span>
          </label>
          <textarea 
            placeholder="Cuéntanos sobre tu situación y objetivos en España..." 
            rows={3} 
            {...register("comment")} 
            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 resize-none text-sm sm:text-base" 
          />
          <p className="text-xs text-gray-500 mt-1">Nos ayudará a preparar tu consulta</p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 sm:p-6 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
            <label className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-0">💰 Precio</label>
            <span className="text-xs sm:text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full w-fit">Pago único</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-2xl sm:text-3xl font-bold text-blue-600">{priceFormatted}</span>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Incluye:</p>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>• Consulta personalizada</p>
                <p>• Asesoramiento legal</p>
                <p>• Documentación</p>
              </div>
            </div>
          </div>
          <input 
            type="number" 
            disabled 
            readOnly 
            {...register("price", { valueAsNumber: true })} 
            className="hidden" 
          />
        </div>

        <div className="mt-4 sm:mt-6">
          <button 
            type="submit" 
            disabled={submitting} 
            onClick={(e) => {
              console.log("Botón clickeado!", { submitting, e });
              if (submitting) {
                e.preventDefault();
                console.log("Botón deshabilitado, previniendo submit");
              }
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold text-base sm:text-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2 sm:gap-3">
                <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm sm:text-base">Procesando pago...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>💳</span>
                <span className="text-sm sm:text-base">Proceder al Pago</span>
                <span>→</span>
              </span>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2 sm:mt-3">
            🔒 Pago seguro por Stripe
          </p>
        </div>
      </form>
    </div>
  );
}