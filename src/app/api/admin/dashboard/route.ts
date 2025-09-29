import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
    }

    // Obtener estadísticas de reservas
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*");

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json({ error: "Error al cargar reservas" }, { status: 500 });
    }

    // Obtener estadísticas de slots de disponibilidad
    const { data: slots, error: slotsError } = await supabase
      .from("availability_slots")
      .select("*")
      .gte("date", new Date().toISOString().split("T")[0]);

    if (slotsError) {
      console.error("Error fetching slots:", slotsError);
      return NextResponse.json({ error: "Error al cargar disponibilidad" }, { status: 500 });
    }

    // Calcular estadísticas
    const totalBookings = bookings?.length || 0;
    const pendingBookings = bookings?.filter(b => b.status === "pending").length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === "cancelled").length || 0;
    
    // Calcular ingresos basado en datos reales
    const totalRevenue = bookings?.reduce((total, booking) => {
      if (booking.status === "confirmed") {
        // Obtener precio del slot o usar precio por defecto basado en duración
        const slot = slots?.find(s => s.id === booking.slot_id);
        if (slot) {
          // Si el slot tiene información de precio, usarla
          return total + (slot.price || 25); // Precio por defecto €25
        }
        // Si no hay slot, usar precio por defecto basado en tipo de visa
        const defaultPrice = booking.visa_type === "general" ? 25 : 25; // Todos los tipos cuestan €25
        return total + defaultPrice;
      }
      return total;
    }, 0) || 0;
    
    const availableSlots = slots?.filter(s => s.is_available).length || 0;
    const bookedSlots = slots?.filter(s => !s.is_available).length || 0;

    // Obtener reservas recientes (últimas 10)
    const recentBookings = bookings
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10) || [];

    const stats = {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue,
      availableSlots,
      bookedSlots,
      recentBookings,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in dashboard API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}





