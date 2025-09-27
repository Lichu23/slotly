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
    const { is_available } = await request.json();

    if (typeof is_available !== "boolean") {
      return NextResponse.json({ error: "is_available debe ser un booleano" }, { status: 400 });
    }

    // Actualizar el slot
    const { data, error } = await supabase
      .from("availability_slots")
      .update({ 
        is_available,
        current_bookings: is_available ? 0 : 1
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating slot:", error);
      return NextResponse.json({ error: "Error al actualizar slot" }, { status: 500 });
    }

    return NextResponse.json({ message: "Slot actualizado exitosamente", slot: data });
  } catch (error) {
    console.error("Error in slot update API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
    }

    const { id } = params;

    // Verificar si el slot tiene reservas
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("slot_id", id);

    if (bookings && bookings.length > 0) {
      return NextResponse.json({ error: "No se puede eliminar un slot con reservas activas" }, { status: 400 });
    }

    // Eliminar el slot
    const { error } = await supabase
      .from("availability_slots")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting slot:", error);
      return NextResponse.json({ error: "Error al eliminar slot" }, { status: 500 });
    }

    return NextResponse.json({ message: "Slot eliminado exitosamente" });
  } catch (error) {
    console.error("Error in slot deletion API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

