import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener todas las reservas del período
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .gte("created_at", startDate.toISOString());

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json({ error: "Error al cargar reservas" }, { status: 500 });
    }

    // Calcular métricas básicas
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;
    const conversionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;
    
    // Calcular tiempo promedio basado en datos reales
    let averageBookingTime = 0;
    if (totalBookings > 0) {
      // Obtener slots para calcular duración promedio
      const { data: slots } = await supabase
        .from("availability_slots")
        .select("duration_minutes")
        .in("id", bookings.map(b => b.slot_id).filter(Boolean));
      
      if (slots && slots.length > 0) {
        const totalMinutes = slots.reduce((sum, slot) => sum + (slot.duration_minutes || 30), 0);
        averageBookingTime = Math.round(totalMinutes / slots.length);
      } else {
        // Si no hay datos de slots, usar 30min por defecto
        averageBookingTime = 30;
      }
    }

    // Agrupar por mes
    const bookingsByMonth = bookings?.reduce((acc: any, booking) => {
      const month = new Date(booking.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {}) || {};

    const bookingsByMonthArray = Object.entries(bookingsByMonth).map(([month, count]) => ({
      month,
      count: count as number
    }));

    // Agrupar por tipo de visa
    const bookingsByVisaType = bookings?.reduce((acc: any, booking) => {
      const visaType = booking.visa_type || 'No especificado';
      acc[visaType] = (acc[visaType] || 0) + 1;
      return acc;
    }, {}) || {};

    const bookingsByVisaTypeArray = Object.entries(bookingsByVisaType).map(([visaType, count]) => ({
      visaType,
      count: count as number
    }));

    // Calcular ingresos por mes basado en datos reales
    const revenueByMonth = bookings?.reduce((acc: any, booking) => {
      if (booking.status === 'confirmed') {
        const month = new Date(booking.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        // Usar precio real del slot o €25 por defecto
        const slot = slots?.find(s => s.id === booking.slot_id);
        const price = slot?.price || 25; // Precio por defecto €25
        acc[month] = (acc[month] || 0) + price;
      }
      return acc;
    }, {}) || {};

    const revenueByMonthArray = Object.entries(revenueByMonth).map(([month, revenue]) => ({
      month,
      revenue: revenue as number
    }));

    // Verificar si hay datos suficientes
    const hasData = totalBookings > 0;
    const noDataMessage = "Aún no hay datos suficientes para mostrar estadísticas";

    const analytics = {
      totalBookings,
      bookingsByMonth: hasData ? bookingsByMonthArray : [],
      bookingsByVisaType: hasData ? bookingsByVisaTypeArray : [],
      revenueByMonth: hasData ? revenueByMonthArray : [],
      averageBookingTime: hasData ? averageBookingTime : 0,
      conversionRate: hasData ? conversionRate : 0,
      hasData,
      noDataMessage: !hasData ? noDataMessage : null,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}





