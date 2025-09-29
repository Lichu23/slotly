import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Fecha es requerida" }, { status: 400 });
    }

    // Obtener slots para la fecha específica
    const { data: slots, error } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("date", date)
      .order("time_slot");

    if (error) {
      console.error("Error fetching slots:", error);
      return NextResponse.json({ error: "Error al cargar slots" }, { status: 500 });
    }

    return NextResponse.json(slots || []);
  } catch (error) {
    console.error("Error in availability API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
    }

    const { date, time_slot } = await request.json();

    if (!date || !time_slot) {
      return NextResponse.json({ error: "Fecha y hora son requeridas" }, { status: 400 });
    }

    // Verificar si ya existe un slot para esa fecha y hora
    const { data: existingSlot } = await supabase
      .from("availability_slots")
      .select("id")
      .eq("date", date)
      .eq("time_slot", time_slot)
      .single();

    if (existingSlot) {
      return NextResponse.json({ error: "Ya existe un slot para esta fecha y hora" }, { status: 400 });
    }

    // Crear nuevo slot
    const { data, error } = await supabase
      .from("availability_slots")
      .insert({
        date,
        time_slot,
        is_available: true,
        max_bookings: 1,
        current_bookings: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating slot:", error);
      return NextResponse.json({ error: "Error al crear slot" }, { status: 500 });
    }

    return NextResponse.json({ message: "Slot creado exitosamente", slot: data });
  } catch (error) {
    console.error("Error in availability creation API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}





