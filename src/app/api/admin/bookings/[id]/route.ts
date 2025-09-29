import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
    }

    const { id } = params;
    const { status } = await request.json();

    if (!status || !["pending", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    // Actualizar el estado de la reserva
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating booking:", error);
      return NextResponse.json({ error: "Error al actualizar reserva" }, { status: 500 });
    }

    // Si se cancela la reserva, liberar el slot
    if (status === "cancelled") {
      const { error: slotError } = await supabase
        .from("availability_slots")
        .update({ 
          is_available: true,
          current_bookings: 0
        })
        .eq("id", data.slot_id);

      if (slotError) {
        console.error("Error updating slot:", slotError);
      }
    }

    // Si se confirma la reserva, asegurar que el slot esté ocupado
    if (status === "confirmed") {
      const { error: slotError } = await supabase
        .from("availability_slots")
        .update({ 
          is_available: false,
          current_bookings: 1
        })
        .eq("id", data.slot_id);

      if (slotError) {
        console.error("Error updating slot:", slotError);
      }
    }

    return NextResponse.json({ message: "Reserva actualizada exitosamente", booking: data });
  } catch (error) {
    console.error("Error in booking update API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}





