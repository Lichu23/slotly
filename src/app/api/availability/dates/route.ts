import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    // Verificar si Supabase está configurado
    if (!supabase) {
      console.log('⚠️ Supabase no configurado, generando fechas por defecto');
      
      // Generar fechas para los próximos 14 días
      const today = new Date();
      const availableDates = [];
      
      for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Saltar fines de semana (opcional)
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingos ni sábados
          availableDates.push({
            date: date.toISOString().split('T')[0],
            hasSlots: true,
            availableSlots: 5 // 5 horarios por día
          });
        }
      }

      return NextResponse.json({ 
        dates: availableDates,
        total: availableDates.length,
        fallback: true
      });
    }

    // Obtener todas las fechas disponibles para los próximos 30 días
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const { data: slots, error } = await supabase
      .from('availability_slots')
      .select('date, time_slot, current_bookings, max_bookings')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', thirtyDaysFromNow.toISOString().split('T')[0])
      .eq('is_available', true)
      .order('date');

    if (error) {
      console.error('Error fetching availability dates:', error);
      console.log('⚠️ Error en base de datos, generando fechas por defecto');
      
      // Fallback a fechas por defecto si hay error en la base de datos
      const today = new Date();
      const availableDates = [];
      
      for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Saltar fines de semana (opcional)
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingos ni sábados
          availableDates.push({
            date: date.toISOString().split('T')[0],
            hasSlots: true,
            availableSlots: 5 // 5 horarios por día
          });
        }
      }

      return NextResponse.json({ 
        dates: availableDates,
        total: availableDates.length,
        fallback: true
      });
    }

    // Si no hay slots en la base de datos, usar fechas por defecto
    if (!slots || slots.length === 0) {
      console.log('⚠️ No hay slots en la base de datos, generando fechas por defecto');
      
      const today = new Date();
      const availableDates = [];
      
      for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Saltar fines de semana (opcional)
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingos ni sábados
          availableDates.push({
            date: date.toISOString().split('T')[0],
            hasSlots: true,
            availableSlots: 5 // 5 horarios por día
          });
        }
      }

      return NextResponse.json({ 
        dates: availableDates,
        total: availableDates.length,
        fallback: true
      });
    }

    // Agrupar por fecha y verificar disponibilidad
    const dateMap = new Map();
    
    slots.forEach(slot => {
      const date = slot.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          hasSlots: false,
          availableSlots: 0
        });
      }
      
      // Verificar si el slot tiene disponibilidad
      if (slot.current_bookings < slot.max_bookings) {
        dateMap.get(date).hasSlots = true;
        dateMap.get(date).availableSlots += 1;
      }
    });

    // Convertir a array y filtrar solo fechas con slots disponibles
    const availableDates = Array.from(dateMap.values())
      .filter(dateInfo => dateInfo.hasSlots)
      .slice(0, 14); // Limitar a 14 días para mejor rendimiento

    return NextResponse.json({ 
      dates: availableDates,
      total: availableDates.length
    });

  } catch (error) {
    console.error('Error in availability dates API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

