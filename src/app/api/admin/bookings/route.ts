import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
    }

    // Obtener todas las reservas con información del slot
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        availability_slots!inner(
          date,
          time_slot
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json({ error: "Error al cargar reservas" }, { status: 500 });
    }

    // Transformar los datos para incluir la información del slot
    const transformedBookings = bookings?.map(booking => ({
      ...booking,
      slot: {
        date: booking.availability_slots.date,
        time_slot: booking.availability_slots.time_slot,
      }
    })) || [];

    return NextResponse.json(transformedBookings);
  } catch (error) {
    console.error("Error in bookings API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}





