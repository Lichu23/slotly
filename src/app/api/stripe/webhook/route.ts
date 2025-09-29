import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";
import { createGoogleCalendarEvent, getAdminGoogleCalendarCredentials } from "@/lib/google-calendar";

export const runtime = "nodejs"; // ensure Node runtime for webhooks

export async function POST(request: Request) {
  // console.log("🔔 Webhook de Stripe recibido");
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-08-27.basil" });
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  // console.log("🔑 Variables de entorno:", {
  //   hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  //   hasWebhookSecret: !!webhookSecret,
  //   hasSignature: !!sig
  // });
  
  if (!sig || !webhookSecret) {
    console.error("❌ Faltan signature o webhook secret");
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }
  
  const buf = Buffer.from(await request.arrayBuffer());
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    // console.log("✅ Evento de Stripe verificado:", event.type);
  } catch (err: unknown) {
    console.error("❌ Error verificando signature:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("💳 Pago completado:", session.id);
      // console.log("📋 Metadata de la sesión:", session.metadata);
      
      // Actualizar booking existente en Supabase
      if (supabase && session.metadata?.email && session.metadata?.selected_date && session.metadata?.selected_time) {
        console.log("💾 Actualizando booking en Supabase...");
        
        // Buscar el slot correspondiente
        const { data: slot, error: slotError } = await supabase
          .from('availability_slots')
          .select('id, current_bookings, max_bookings')
          .eq('date', session.metadata.selected_date)
          .eq('time_slot', session.metadata.selected_time)
          .single();

        if (slot && !slotError) {
          // Buscar booking existente por slot_id y email
          const { data: existingBooking, error: findError } = await supabase
            .from('bookings')
            .select('id')
            .eq('slot_id', slot.id)
            .eq('customer_email', session.metadata.email)
            .eq('status', 'pending')
            .single();

          if (existingBooking && !findError) {
            // Actualizar booking existente
            const { data: booking, error: bookingError } = await supabase
              .from('bookings')
              .update({
                status: 'confirmed',
                payment_id: session.id,
                price: session.amount_total ? session.amount_total / 100 : null, // Precio real pagado en euros
                updated_at: new Date().toISOString()
              })
              .eq('id', existingBooking.id)
              .select()
              .single();

            if (booking && !bookingError) {
              console.log("✅ Booking actualizado exitosamente:", booking.id);
              
              // Actualizar current_bookings en el slot
              const { error: slotUpdateError } = await supabase
                .from('availability_slots')
                .update({ 
                  current_bookings: slot.current_bookings + 1,
                  updated_at: new Date().toISOString()
                })
                .eq('id', slot.id);

              if (slotUpdateError) {
                console.error('❌ AVAILABILITY_SLOTS UPDATE ERROR:', slotUpdateError);
              } else {
                console.log(`✅ AVAILABILITY_SLOTS UPDATE SUCCESS - Slot ${slot.id} actualizado: ${slot.current_bookings} -> ${slot.current_bookings + 1}`);
              }
            } else {
              console.error("❌ Error actualizando booking:", bookingError);
            }
          } else {
            console.log("⚠️ No se encontró booking pendiente, creando nuevo...");
            // Crear booking nuevo como fallback
            const { data: booking, error: bookingError } = await supabase
              .from('bookings')
              .insert({
                slot_id: slot.id,
                customer_name: session.metadata.name,
                customer_email: session.metadata.email,
                customer_phone: session.metadata.phone,
                visa_type: session.metadata.visa_type,
                price: session.amount_total ? session.amount_total / 100 : null, // Precio real pagado en euros
                status: 'confirmed',
                payment_id: session.id
              })
              .select()
              .single();

            if (booking && !bookingError) {
              console.log("✅ Booking creado exitosamente:", booking.id);
              
              // Actualizar current_bookings en el slot
              const { error: slotUpdateError } = await supabase
                .from('availability_slots')
                .update({ 
                  current_bookings: slot.current_bookings + 1,
                  updated_at: new Date().toISOString()
                })
                .eq('id', slot.id);

              if (slotUpdateError) {
                console.error('❌ AVAILABILITY_SLOTS UPDATE ERROR:', slotUpdateError);
              } else {
                console.log(`✅ AVAILABILITY_SLOTS UPDATE SUCCESS - Slot ${slot.id} actualizado: ${slot.current_bookings} -> ${slot.current_bookings + 1}`);
              }
            } else {
              console.error("❌ Error creando booking:", bookingError);
            }
          }
        } else {
          console.error("❌ No se encontró el slot para la fecha y hora seleccionadas");
        }
      } else {
        console.log("⚠️ No se pudo actualizar booking - faltan datos en metadata");
      }

      // Preparar datos comunes para ambos emails
      const { visa_type, name, email, phone, invitados, comment, selected_date, selected_time } = session.metadata || {};
      const price = session.amount_total ? session.amount_total / 100 : 0; // Convertir de centavos a euros
      
      // Crear fecha y hora de inicio y fin del evento (CORREGIDO: validación de fechas)
      let startDateTime: Date;
      
      if (selected_date && selected_time) {
        try {
          // Crear fecha interpretándola como hora local de España
          const [year, month, day] = selected_date.split('-').map(Number);
          const [hours, minutes] = selected_time.split(':').map(Number);
          
          // Crear fecha en zona horaria local (España)
          startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
          
          // Verificar que la fecha es válida
          if (isNaN(startDateTime.getTime())) {
            console.error("❌ Fecha inválida:", selected_date, selected_time);
            startDateTime = new Date(); // Fallback a fecha actual
          }
        } catch (error) {
          console.error("❌ Error creando fecha:", error);
          startDateTime = new Date(); // Fallback a fecha actual
        }
      } else {
        startDateTime = new Date(); // Fallback a fecha actual
      }
      
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutos después
      
      // Intentar crear evento en Google Calendar real
      let meetLink = `https://meet.google.com/${Math.random().toString(36).substring(2, 15)}`; // Fallback
      
      try {
        // Obtener credenciales del admin
        const adminCredentials = await getAdminGoogleCalendarCredentials();
        
        if (adminCredentials) {
          console.log("📅 Creando evento real en Google Calendar...");
          console.log("🔍 Credenciales encontradas para:", adminCredentials.email);
          
          // Validar que las fechas son válidas antes de crear el evento
          if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.error("❌ Fechas inválidas, no se puede crear el evento en Google Calendar");
            throw new Error("Fechas inválidas para el evento");
          }
          
          const eventData = {
            summary: `Consulta de Visa - ${visa_type?.toUpperCase()} - ${name}`,
            description: `Consulta de visa con ${name}

Tipo: ${visa_type?.toUpperCase()}
Cliente: ${name}
Email: ${email}
Teléfono: ${phone}
Duración: 30 minutos
${invitados ? `Invitados: ${invitados}` : ''}

Comentarios del cliente: ${comment || 'Sin comentarios adicionales'}

¡Consulta confirmada!`,
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
            attendees: [
              {
                email: email,
                name: name
              }
            ]
          };
          
          const googleResult = await createGoogleCalendarEvent(adminCredentials, eventData);
          
          if (googleResult.success && googleResult.meetLink) {
            meetLink = googleResult.meetLink;
            console.log("✅ Evento creado exitosamente en Google Calendar");
            console.log("🔗 Enlace Meet oficial:", meetLink);
          } else {
            console.log("⚠️ Error creando evento en Google Calendar:", googleResult.error);
            console.log("🔄 Usando enlace de Meet manual como fallback");
          }
        } else {
          console.log("⚠️ No hay credenciales de Google Calendar configuradas");
          console.log("🔄 Usando enlace de Meet manual");
        }
      } catch (error) {
        console.error("❌ Error con Google Calendar:", error);
        console.log("🔄 Usando enlace de Meet manual como fallback");
      }

      // Enviar email de notificación con archivo .ics al owner
      try {
        // console.log("📧 Enviando email de notificación con archivo .ics al owner...");
        
        // Formatear fechas para iCalendar con zona horaria
        const formatDateForICS = (date: Date, useTimezone = false) => {
          if (useTimezone) {
            // Formato con zona horaria (Europe/Madrid)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
          } else {
            // Formato UTC
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          }
        };
        
        const startTimeFormatted = formatDateForICS(startDateTime, true);
        const endTimeFormatted = formatDateForICS(endDateTime, true);
        const nowFormatted = formatDateForICS(new Date());
        
        // Generar UID único para el evento
        const eventUID = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}@consultas-visa.com`;
        
        // Crear archivo .ics (iCalendar) para el owner
        const eventTitle = `Consulta de Visa - ${visa_type?.toUpperCase()} - ${name}`;
        const eventDescription = `Consulta de visa con ${name}

Tipo: ${visa_type?.toUpperCase()}
Cliente: ${name}
Email: ${email}
Teléfono: ${phone}
Duración: 30 minutos
${invitados ? `Invitados: ${invitados}` : ''}

Comentarios del cliente: ${comment || 'Sin comentarios adicionales'}

¡Consulta confirmada!`;

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Consultas Visa//Evento//ES
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${eventUID}
DTSTAMP:${nowFormatted}
DTSTART;TZID=Europe/Madrid:${startTimeFormatted}
DTEND;TZID=Europe/Madrid:${endTimeFormatted}
SUMMARY:${eventTitle}
DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}
LOCATION:${meetLink}
URL:${meetLink}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Recordatorio: ${eventTitle}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:EMAIL
DESCRIPTION:Recordatorio por email: ${eventTitle}
END:VALARM
END:VEVENT
END:VCALENDAR`;

        // Configurar transporter de email (usando las mismas variables que send-email)
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        // Enviar email al owner con archivo .ics (FORMATO CON SECCIONES MEJORADO)
        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'noreply@consultas-visa.com',
          to: process.env.EMAIL_USER || 'admin@consultas-visa.com', // Enviar al mismo email del admin
          subject: `Nueva consulta de visa - ${name} - ${selected_date} ${selected_time}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px;">
                Nueva Consulta de Visa - ${visa_type?.toUpperCase()}
              </h2>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📅 Detalles de la Consulta</h3>
                <p style="margin: 8px 0;"><strong>Tipo de Visa:</strong> ${visa_type?.toUpperCase()}</p>
                <p style="margin: 8px 0;"><strong>Precio:</strong> €${price}</p>
                <p style="margin: 8px 0;"><strong>Fecha Solicitada:</strong> ${selected_date}</p>
                <p style="margin: 8px 0;"><strong>Horario Solicitado:</strong> ${selected_time}</p>
                ${invitados ? `<p style="margin: 8px 0;"><strong>Invitados:</strong> ${invitados}</p>` : ''}
              </div>
              
              <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">👤 Información del Cliente</h3>
                <p style="margin: 8px 0;"><strong>Nombre:</strong> ${name}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a></p>
                <p style="margin: 8px 0;"><strong>Teléfono:</strong> <a href="tel:${phone}" style="color: #007bff; text-decoration: none;">${phone}</a></p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">💬 Comentarios Adicionales</h3>
                <p style="margin: 8px 0; font-style: italic;">${comment || 'Sin comentarios adicionales'}</p>
              </div>
              
              <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0dcaf0;">
                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🔗 Enlace de Google Meet</h3>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${meetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Unirse a la Reunión
                  </a>
                </div>
                <p style="margin: 8px 0; font-size: 14px; color: #6c757d;">
                  <strong>Enlace:</strong> <a href="${meetLink}" style="color: #007bff; text-decoration: none;">${meetLink}</a>
                </p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c757d;">
                <h4 style="color: #333; margin-top: 0; margin-bottom: 10px;">💳 Información del Pago</h4>
                <p style="margin: 8px 0;"><strong>ID de pago:</strong> ${session.id}</p>
                <p style="margin: 8px 0;"><strong>Estado:</strong> <span style="color: #28a745; font-weight: bold;">Confirmado</span></p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                Enviado desde el sistema de consultas de visas<br>
                Fecha: ${new Date().toLocaleString('es-ES')}
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `consulta-visa-${name}-${selected_date}.ics`,
              content: icsContent,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
            },
          ],
        });

        console.log("✅ Email de notificación enviado al owner");
      } catch (emailError) {
        console.error("❌ Error enviando email de notificación:", emailError);
      }

      // Enviar email de confirmación al cliente
      try {
        // console.log("📧 Enviando email de confirmación al cliente...");
        
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        // Crear archivo .ics para el cliente
        const clientEventUID = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-client@consultas-visa.com`;
        
        // Función helper para formatear fechas para iCalendar
        const formatDateForICS = (date: Date, useTimezone = false) => {
          if (useTimezone) {
            // Formato con zona horaria (Europe/Madrid)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
          } else {
            // Formato UTC
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          }
        };
        
        const clientIcsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Consultas Visa//Evento Cliente//ES
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${clientEventUID}
DTSTAMP:${formatDateForICS(new Date())}
DTSTART;TZID=Europe/Madrid:${formatDateForICS(startDateTime, true)}
DTEND;TZID=Europe/Madrid:${formatDateForICS(endDateTime, true)}
SUMMARY:Consulta de Visa - ${visa_type?.toUpperCase()}
DESCRIPTION:Consulta de visa confirmada\\n\\nTipo: ${visa_type?.toUpperCase()}\\nDuración: 30 minutos\\n\\n¡Consulta confirmada!
LOCATION:${meetLink}
URL:${meetLink}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Recordatorio: Consulta de Visa
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:EMAIL
DESCRIPTION:Recordatorio por email: Consulta de Visa
END:VALARM
END:VEVENT
END:VCALENDAR`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'noreply@consultas-visa.com',
          to: email,
          subject: `Consulta de visa confirmada - ${selected_date} ${selected_time}`,
          html: `
            <h2>¡Consulta de visa confirmada!</h2>
            <p>Hola ${name},</p>
            <p>Tu consulta de visa ha sido confirmada exitosamente.</p>
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Detalles de tu consulta:</h3>
              <p><strong>Tipo de visa:</strong> ${visa_type?.toUpperCase()}</p>
              <p><strong>Fecha y hora:</strong> ${selected_date} a las ${selected_time}</p>
              <p><strong>Duración:</strong> 30 minutos</p>
              <p><strong>Precio pagado:</strong> €${price}</p>
              ${invitados ? `<p><strong>Invitados:</strong> ${invitados}</p>` : ''}
            </div>
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🔗 Enlace de Google Meet:</h3>
              <p><a href="${meetLink}" style="color: #059669; font-weight: bold; text-decoration: none;">${meetLink}</a></p>
              <p style="font-size: 14px; color: #6b7280;">Haz clic en el enlace para unirte a la videollamada</p>
            </div>
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>📝 Comentarios que proporcionaste:</h4>
              <p style="font-style: italic;">${comment || 'Sin comentarios adicionales'}</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>ℹ️ Información importante:</h4>
              <ul>
                <li>El enlace de Google Meet estará disponible 5 minutos antes de la hora programada</li>
                <li>Te recomendamos probar tu cámra y micrófono antes de la consulta</li>
                <li>Si tienes algún problema técnico, contacta con nosotros</li>
                <li>Recibirás un recordatorio por email 1 hora antes de la consulta</li>
              </ul>
            </div>
            <p>¡Esperamos verte pronto!</p>
            <p>Saludos,<br>El equipo de Consultas de Visa</p>
          `,
          attachments: [
            {
              filename: `consulta-visa-${selected_date}.ics`,
              content: clientIcsContent,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
            },
          ],
        });

        console.log("✅ Email de confirmación enviado al cliente");
      } catch (emailError) {
        console.error("❌ Error enviando email de confirmación:", emailError);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}