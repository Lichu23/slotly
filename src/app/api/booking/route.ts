import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { slotId, customerData, visaType, price } = await req.json();
    
    if (!slotId || !customerData || !visaType) {
      return NextResponse.json({ 
        error: "Slot ID, customer data, and visa type are required" 
      }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
    }

    // Verificar que el slot sigue disponible
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      console.error('❌ Slot not found:', slotError);
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    if (slot.current_bookings >= slot.max_bookings) {
      console.log(`❌ Slot ${slotId} ya está lleno: ${slot.current_bookings}/${slot.max_bookings}`);
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
        visa_type: visaType,
        price: price || null, // Guardar precio si está disponible
        status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // Actualizar contador de bookings en el slot
    console.log(`📝 AVAILABILITY_SLOTS UPDATE - Slot ${slotId}: ${slot.current_bookings} -> ${slot.current_bookings + 1} bookings`);
    
    const { error: updateError } = await supabase
      .from('availability_slots')
      .update({ 
        current_bookings: slot.current_bookings + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId);

    if (updateError) {
      console.error('❌ AVAILABILITY_SLOTS UPDATE ERROR:', updateError);
      // Rollback del booking si falla la actualización
      await supabase.from('bookings').delete().eq('id', booking.id);
      return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
    }

    console.log(`✅ AVAILABILITY_SLOTS UPDATE SUCCESS - Slot ${slotId} actualizado exitosamente`);

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
    }

    // Obtener todos los slots para la fecha
    const { data: slots, error } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('date', date)
      .eq('is_available', true)
      .order('time_slot');

    if (error) {
      console.error('Error fetching slots:', error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Filtrar solo los slots disponibles
    const availableSlots = slots.filter(slot => 
      slot.current_bookings < slot.max_bookings
    );

    return NextResponse.json({ 
      date,
      slots: availableSlots.map(slot => ({
        id: slot.id,
        time: slot.time_slot,
        available: slot.current_bookings < slot.max_bookings,
        currentBookings: slot.current_bookings,
        maxBookings: slot.max_bookings
      }))
    });

  } catch (error) {
    console.error('Error in booking GET API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

