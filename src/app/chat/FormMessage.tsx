"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const priceByVisa: Record<"estudio" | "nomada" | "trabajo", number> = {
  estudio: 5900, // in EUR cents e.g., €59.00
  nomada: 6900,
  trabajo: 7900,
};

const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  invitados: z
    .union([z.string().length(0), z.string().regex(/^\d+$/)])
    .optional()
    .transform((v) => (v ? parseInt(v as string, 10) : undefined)),
  comment: z.string().optional(),
  phone: z.string().min(6, "Número inválido"),
  price: z.coerce.number().min(100),
});

type FormValues = z.infer<typeof schema>;

export function FormMessage({ visaType, presetComment }: { visaType: "estudio" | "nomada" | "trabajo"; presetComment?: string }) {
  const priceCents = useMemo(() => priceByVisa[visaType], [visaType]);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comment: presetComment, price: priceCents },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      // Persist lead (best-effort). Ignore failure for UX.
      try {
        await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, visa_type: visaType }),
        });
      } catch {}

      const res = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visa_type: visaType,
          price_cents: priceCents,
          name: values.name,
          email: values.email,
          phone: values.phone,
          invitados: values.invitados,
          comment: values.comment,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const priceFormatted = useMemo(() => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(priceCents / 100), [priceCents]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2 mt-2">
      <div className="font-semibold">Formulario — {visaType.toUpperCase()}</div>
      <input placeholder="Nombre" {...register("name")} className="border rounded-md px-3 py-2" />
      {errors.name && <span className="text-red-600 text-sm">{errors.name.message}</span>}
      <input placeholder="Email" type="email" {...register("email")} className="border rounded-md px-3 py-2" />
      {errors.email && <span className="text-red-600 text-sm">{errors.email.message}</span>}
      <input placeholder="Invitados (opcional)" {...register("invitados")} className="border rounded-md px-3 py-2" />
      <textarea placeholder="Comentario" rows={3} {...register("comment")} className="border rounded-md px-3 py-2" />
      <input placeholder="Número de Teléfono" {...register("phone")} className="border rounded-md px-3 py-2" />
      <div>
        <label className="block text-xs opacity-80">Precio ({priceFormatted})</label>
        <input type="number" disabled readOnly {...register("price", { valueAsNumber: true })} className="border rounded-md px-3 py-2 mt-1 opacity-70 cursor-not-allowed" />
      </div>
      <button type="submit" disabled={submitting} className="px-3 py-2 rounded-lg bg-neutral-900 text-white disabled:opacity-60">
        {submitting ? "Procesando..." : "Pagar con Stripe"}
      </button>
    </form>
  );
}


