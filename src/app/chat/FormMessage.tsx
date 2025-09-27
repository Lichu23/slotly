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
  selectedTime 
}: { 
  visaType: "estudio" | "nomada" | "trabajo" | "general"; 
  presetComment?: string; 
  customPrice?: number;
  selectedDate?: string | null;
  selectedTime?: string | null;
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
      className="w-full px-4 py-6 max-h-[60vh] overflow-y-auto"
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-black mb-3">📋 Formulario de Consulta</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {visaType === "general" ? "🤔 Consulta General" : `✅ Visa de ${visaType.charAt(0).toUpperCase() + visaType.slice(1)}`}
          </div>
          {selectedDate && selectedTime && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              📅 {new Date(selectedDate).toLocaleDateString('es-ES')} - {selectedTime}
            </div>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Información importante:</strong> Completa todos los campos obligatorios (*) para proceder con el pago y agendar tu consulta.
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
        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-red-500">*</span>
              <span>Nombre completo</span>
            </label>
            <input 
              placeholder="Ej: María García López" 
              {...register("name")} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-base" 
            />
            {errors.name && <span className="text-red-600 text-sm mt-2 flex items-center gap-1">
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
              placeholder="maria.garcia@email.com" 
              type="email" 
              {...register("email")} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-base" 
            />
            {errors.email && <span className="text-red-600 text-sm mt-2 flex items-center gap-1">
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-base" 
            />
            {errors.phone && <span className="text-red-600 text-sm mt-2 flex items-center gap-1">
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
              placeholder="Número de acompañantes (ej: 2)" 
              {...register("invitados")} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 text-base" 
            />
            <p className="text-xs text-gray-500 mt-1">Si vienes acompañado, indica cuántas personas</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-gray-400">*</span>
            <span>Comentarios adicionales</span>
            <span className="text-xs text-gray-500 font-normal">(opcional)</span>
          </label>
          <textarea 
            placeholder="Cuéntanos más sobre tu situación específica, objetivos en España, dudas particulares, etc..." 
            rows={4} 
            {...register("comment")} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-gray-400 resize-none text-base" 
          />
          <p className="text-xs text-gray-500 mt-1">Esta información nos ayudará a preparar mejor tu consulta</p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-lg font-semibold text-gray-800">💰 Precio del servicio</label>
            <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">Pago único</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-blue-600">{priceFormatted}</span>
            <div className="text-right">
              <p className="text-sm text-gray-600">Incluye:</p>
              <p className="text-xs text-gray-500">• Consulta personalizada</p>
              <p className="text-xs text-gray-500">• Asesoramiento legal</p>
              <p className="text-xs text-gray-500">• Documentación necesaria</p>
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

        <div className="mt-6">
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando pago...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>💳</span>
                <span>Proceder al Pago con Stripe</span>
                <span>→</span>
              </span>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            🔒 Pago seguro procesado por Stripe. No almacenamos información de tarjeta.
          </p>
        </div>
      </form>
    </div>
  );
}