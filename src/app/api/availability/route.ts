import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    // Verificar si Supabase está configurado
    if (!supabase) {
      console.log('⚠️ Supabase no configurado, usando horarios por defecto');
      
      // Horarios por defecto cuando no hay base de datos
      const defaultSlots = [
        { id: 1, time: "09:00", available: true },
        { id: 2, time: "10:30", available: true },
        { id: 3, time: "12:00", available: true },
        { id: 4, time: "15:00", available: true },
        { id: 5, time: "17:30", available: true }
      ];

      return NextResponse.json({ 
        date,
        slots: defaultSlots,
        fallback: true
      });
    }
    
    // Buscar horarios disponibles para la fecha específica
    const { data: slots, error } = await supabase
      .from('availability_slots')
      .select(`
        *,
        bookings!inner(
          id,
          status
        )
      `)
      .eq('date', date)
      .eq('is_available', true)
      .order('time_slot');

    if (error) {
      console.error('Error fetching availability:', error);
      console.log('⚠️ Error en base de datos, usando horarios por defecto');
      
      // Fallback a horarios por defecto si hay error en la base de datos
      const defaultSlots = [
        { id: 1, time: "09:00", available: true },
        { id: 2, time: "10:30", available: true },
        { id: 3, time: "12:00", available: true },
        { id: 4, time: "15:00", available: true },
        { id: 5, time: "17:30", available: true }
      ];

      return NextResponse.json({ 
        date,
        slots: defaultSlots,
        fallback: true
      });
    }

    // Si no hay slots en la base de datos, usar horarios por defecto
    if (!slots || slots.length === 0) {
      console.log('⚠️ No hay slots en la base de datos, usando horarios por defecto');
      
      const defaultSlots = [
        { id: 1, time: "09:00", available: true },
        { id: 2, time: "10:30", available: true },
        { id: 3, time: "12:00", available: true },
        { id: 4, time: "15:00", available: true },
        { id: 5, time: "17:30", available: true }
      ];

      return NextResponse.json({ 
        date,
        slots: defaultSlots,
        fallback: true
      });
    }

    // Filtrar solo los slots que no están completamente ocupados
    const availableSlots = slots.filter(slot => 
      slot.current_bookings < slot.max_bookings
    );

    return NextResponse.json({ 
      date,
      slots: availableSlots.map(slot => ({
        id: slot.id,
        time: slot.time_slot,
        available: slot.current_bookings < slot.max_bookings
      }))
    });

  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { slotId, customerData } = await req.json();
    
    if (!slotId || !customerData) {
      return NextResponse.json({ error: "Slot ID and customer data are required" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
    }
    
    // Verificar que el slot sigue disponible
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    if (slot.current_bookings >= slot.max_bookings) {
      return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
    }

    // Crear booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        slot_id: slotId,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // Actualizar contador de bookings
    const { error: updateError } = await supabase
      .from('availability_slots')
      .update({ 
        current_bookings: slot.current_bookings + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId);

    if (updateError) {
      console.error('Error updating slot:', updateError);
      // Rollback del booking si falla la actualización
      await supabase.from('bookings').delete().eq('id', booking.id);
      return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      bookingId: booking.id,
      slot: {
        date: slot.date,
        time: slot.time_slot
      }
    });

  } catch (error) {
    console.error('Error in booking API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
