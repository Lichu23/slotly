import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";
import { createGoogleCalendarEvent, getAdminGoogleCalendarCredentials } from "@/lib/google-calendar";

export const runtime = "nodejs"; // ensure Node runtime for webhooks

export async function POST(request: Request) {
  console.log("🔔 Webhook de Stripe recibido");
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  console.log("🔑 Variables de entorno:", {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!webhookSecret,
    hasSignature: !!sig
  });
  
  if (!sig || !webhookSecret) {
    console.error("❌ Faltan signature o webhook secret");
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }
  
  const buf = Buffer.from(await request.arrayBuffer());
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log("✅ Evento de Stripe verificado:", event.type);
  } catch (err: any) {
    console.error("❌ Error verificando signature:", err.message);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("💳 Pago completado:", session.id);
      console.log("📋 Metadata de la sesión:", session.metadata);
      
      // Crear booking en Supabase
      if (supabase && session.metadata?.email && session.metadata?.selected_date && session.metadata?.selected_time) {
        console.log("💾 Creando booking en Supabase...");
        
        // Buscar el slot correspondiente
        const { data: slot, error: slotError } = await supabase
          .from('availability_slots')
          .select('id')
          .eq('date', session.metadata.selected_date)
          .eq('time_slot', session.metadata.selected_time)
          .single();

        if (slot && !slotError) {
          // Crear booking
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
              slot_id: slot.id,
              customer_name: session.metadata.name,
              customer_email: session.metadata.email,
              customer_phone: session.metadata.phone,
              visa_type: session.metadata.visa_type,
              status: 'confirmed',
              payment_id: session.id
            })
            .select()
            .single();

          if (booking && !bookingError) {
            console.log("✅ Booking creado exitosamente:", booking.id);
          } else {
            console.error("❌ Error creando booking:", bookingError);
          }
        } else {
          console.error("❌ No se encontró el slot para la fecha y hora seleccionadas");
        }
      } else {
        console.log("⚠️ No se pudo crear booking - faltan datos en metadata");
      }

      // Preparar datos comunes para ambos emails
      const { visa_type, name, email, phone, invitados, comment, selected_date, selected_time } = session.metadata || {};
      const price = session.amount_total ? session.amount_total / 100 : 0; // Convertir de centavos a euros
      
      // Crear fecha y hora de inicio y fin del evento
      const startDateTime = selected_date && selected_time ? 
        new Date(`${selected_date}T${selected_time}:00`) : new Date();
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutos después
      
      // Intentar crear evento en Google Calendar real
      let meetLink = `https://meet.google.com/${Math.random().toString(36).substring(2, 15)}`; // Fallback
      let googleCalendarEvent = null;
      
      try {
        // Obtener credenciales del admin
        const adminCredentials = await getAdminGoogleCalendarCredentials();
        
        if (adminCredentials) {
          console.log("📅 Creando evento real en Google Calendar...");
          
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
            googleCalendarEvent = googleResult.event;
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
        console.log("📧 Enviando email de notificación con archivo .ics al owner...");
        
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
Enlace de Google Meet: ${meetLink}
${invitados ? `Invitados: ${invitados}` : ''}

Comentarios del cliente: ${comment || 'Sin comentarios adicionales'}

¡Consulta confirmada!`;

        const ownerIcsContent = `BEGIN:VCALENDAR
PRODID:-//Consultas Visa//Consulta de Visa//ES
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VTIMEZONE
TZID:Europe/Madrid
X-LIC-LOCATION:Europe/Madrid
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID=Europe/Madrid:${startTimeFormatted}
DTEND;TZID=Europe/Madrid:${endTimeFormatted}
DTSTAMP:${nowFormatted}
ORGANIZER;CN=Consultas Visa:mailto:${process.env.EMAIL_USER || 'lisandroxarenax@gmail.com'}
UID:${eventUID}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE;CN=${name}:mailto:${email}
X-GOOGLE-CONFERENCE:${meetLink}
CREATED:${nowFormatted}
DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}
LAST-MODIFIED:${nowFormatted}
LOCATION:${meetLink}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${eventTitle}
TRANSP:OPAQUE
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Recordatorio: Consulta de Visa con ${name} en 15 minutos
END:VALARM
END:VEVENT
END:VCALENDAR`;
        
        // Configurar el email para el owner
        const ownerEmail = process.env.EMAIL_USER || 'lisandroxarenax@gmail.com';
        const ownerSubject = `Nueva Consulta de Visa - ${visa_type?.toUpperCase()} - ${name}`;
        
        const ownerEmailBody = `
Nueva consulta de visa recibida:

TIPO DE VISA: ${visa_type?.toUpperCase()}
PRECIO: €${price}
FECHA SOLICITADA: ${selected_date || 'No especificada'}
HORARIO SOLICITADO: ${selected_time || 'No especificado'}

INFORMACIÓN DEL CLIENTE:
- Nombre: ${name}
- Email: ${email}
- Teléfono: ${phone}
${invitados ? `- Invitados: ${invitados}` : ''}

COMENTARIOS ADICIONALES:
${comment || 'Sin comentarios adicionales'}

ENLACE DE GOOGLE MEET:
${meetLink}

---
Enviado desde el sistema de consultas de visas
Fecha: ${new Date().toLocaleString('es-ES')}
        `.trim();

        // Configurar Nodemailer
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'lisandroxarenax@gmail.com',
            pass: process.env.EMAIL_PASS || 'tu_app_password_aqui'
          }
        });

        // Enviar email al owner con archivo .ics adjunto
        const ownerMailOptions = {
          from: process.env.EMAIL_USER || 'lisandroxarenax@gmail.com',
          to: ownerEmail,
          subject: ownerSubject,
          text: ownerEmailBody,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">
                Nueva Consulta de Visa - ${visa_type?.toUpperCase()}
              </h2>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Detalles de la Consulta</h3>
                <p><strong>Tipo de Visa:</strong> ${visa_type?.toUpperCase()}</p>
                <p><strong>Precio:</strong> €${price}</p>
                <p><strong>Fecha Solicitada:</strong> ${selected_date || 'No especificada'}</p>
                <p><strong>Horario Solicitado:</strong> ${selected_time || 'No especificado'}</p>
              </div>
              
              <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Información del Cliente</h3>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${phone}</p>
                ${invitados ? `<p><strong>Invitados:</strong> ${invitados}</p>` : ''}
              </div>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Comentarios Adicionales</h3>
                <p>${comment || 'Sin comentarios adicionales'}</p>
              </div>
              
              <div style="background-color: #2c3e50; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <h3 style="color: white; margin-top: 0;">🔗 Enlace de Google Meet</h3>
                <a href="${meetLink}" style="display: inline-block; background-color: white; color: #2c3e50; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Unirse a la Reunión
                </a>
                <p style="color: white; margin: 15px 0 0 0; font-size: 14px;">
                  Enlace: <a href="${meetLink}" style="color: white; text-decoration: underline;">${meetLink}</a>
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                Enviado desde el sistema de consultas de visas<br>
                Fecha: ${new Date().toLocaleString('es-ES')}
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `consulta-visa-${name}-${selected_date || 'cita'}.ics`,
              content: ownerIcsContent,
              contentType: 'text/calendar; charset=utf-8'
            }
          ]
        };

        // Verificar si tenemos configuración real de email
        const hasRealConfig = process.env.EMAIL_USER && 
                             process.env.EMAIL_PASS && 
                             process.env.EMAIL_PASS !== 'tu_app_password_aqui';

        console.log("🔧 Configuración de email:", {
          hasEmailUser: !!process.env.EMAIL_USER,
          hasEmailPass: !!process.env.EMAIL_PASS,
          hasRealConfig: hasRealConfig
        });

        if (!hasRealConfig) {
          console.log("⚠️ No hay configuración real de email, solo logueando");
          console.log("📧 Email que se habría enviado al owner:");
          console.log("   Para:", ownerEmail);
          console.log("   Asunto:", ownerSubject);
          console.log("   Enlace Meet:", meetLink);
          console.log("   Archivo .ics generado:", ownerIcsContent.substring(0, 200) + "...");
        } else {
          console.log("📧 Enviando email real al owner...");
          // Enviar el email real al owner
          const ownerResult = await transporter.sendMail(ownerMailOptions);
          console.log("✅ Email de notificación al owner enviado exitosamente!");
          console.log("📧 Message ID:", ownerResult.messageId);
          console.log("📧 Response:", ownerResult.response);
          console.log("🔗 Enlace de Google Meet generado:", meetLink);
          console.log("📅 Archivo .ics generado y adjunto para el owner");
        }
        
      } catch (emailError) {
        console.error("❌ Error enviando email de notificación al owner:", emailError);
        // No lanzamos el error para no afectar el webhook
      }

      // Enviar email de invitación con archivo .ics (iCalendar) al cliente
      try {
        console.log("📧 Enviando email de invitación con archivo .ics al cliente...");
        
        const { visa_type, name, email, phone, invitados, comment, selected_date, selected_time } = session.metadata || {};
        
        // Usar el mismo enlace de Google Meet que se generó para el owner
        // El meetLink ya está definido en la sección del owner arriba
        
        // Formatear la fecha y hora para el email
        const appointmentDate = selected_date ? new Date(selected_date).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'Fecha por confirmar';
        
        const appointmentTime = selected_time || 'Horario por confirmar';
        
        // Crear fecha y hora de inicio y fin del evento
        const startDateTime = selected_date && selected_time ? 
          new Date(`${selected_date}T${selected_time}:00`) : new Date();
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutos después
        
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
        
        // Crear archivo .ics (iCalendar) mejorado
        const eventTitle = `Consulta de Visa - ${visa_type?.toUpperCase()}`;
        const eventDescription = `Consulta de visa para ${name}

Tipo: ${visa_type?.toUpperCase()}
Duración: 30 minutos
Enlace de Google Meet: ${meetLink}

Comentarios: ${comment || 'Sin comentarios adicionales'}

¡Nos vemos en la consulta!`;

        const icsContent = `BEGIN:VCALENDAR
PRODID:-//Consultas Visa//Consulta de Visa//ES
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VTIMEZONE
TZID:Europe/Madrid
X-LIC-LOCATION:Europe/Madrid
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID=Europe/Madrid:${startTimeFormatted}
DTEND;TZID=Europe/Madrid:${endTimeFormatted}
DTSTAMP:${nowFormatted}
ORGANIZER;CN=Consultas Visa:mailto:${process.env.EMAIL_USER || 'lisandroxarenax@gmail.com'}
UID:${eventUID}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${name}:mailto:${email}
X-GOOGLE-CONFERENCE:${meetLink}
CREATED:${nowFormatted}
DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}
LAST-MODIFIED:${nowFormatted}
LOCATION:${meetLink}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${eventTitle}
TRANSP:OPAQUE
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Recordatorio: Consulta de Visa en 15 minutos
END:VALARM
END:VEVENT
END:VCALENDAR`;
        
        // Configurar el email para el cliente
        const clientEmail = email;
        const clientSubject = `Cita confirmada: Consulta de Visa - ${appointmentDate} ${appointmentTime}`;
        
        const clientEmailBody = `
¡Hola ${name}!

Tu consulta de visa ha sido confirmada exitosamente.

DETALLES DE LA CITA:
- Tipo de consulta: ${visa_type?.toUpperCase()}
- Fecha: ${appointmentDate}
- Hora: ${appointmentTime}
- Duración: 30 minutos

ENLACE DE GOOGLE MEET:
${meetLink}

INSTRUCCIONES:
1. El día de la cita, haz clic en el enlace de Google Meet
2. Asegúrate de tener una buena conexión a internet
3. Si tienes problemas técnicos, contacta al +34 123 456 789

¡Esperamos verte pronto!

Saludos,
Equipo de Consultas de Visa
        `.trim();

        // Configurar Nodemailer para el cliente
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'lisandroxarenax@gmail.com',
            pass: process.env.EMAIL_PASS || 'tu_app_password_aqui'
          }
        });

        // Enviar email al cliente con archivo .ics adjunto
        const clientMailOptions = {
          from: process.env.EMAIL_USER || 'lisandroxarenax@gmail.com',
          to: clientEmail,
          subject: clientSubject,
          text: clientEmailBody,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
              <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">¡Cita Confirmada!</h1>
                  <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Consulta de Visa</p>
                </div>
                
                <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #2c3e50; margin-top: 0; font-size: 20px;">Detalles de la Cita</h2>
                  <p style="margin: 8px 0; color: #34495e;"><strong>Tipo de consulta:</strong> ${visa_type?.toUpperCase()}</p>
                  <p style="margin: 8px 0; color: #34495e;"><strong>Fecha:</strong> ${appointmentDate}</p>
                  <p style="margin: 8px 0; color: #34495e;"><strong>Hora:</strong> ${appointmentTime}</p>
                  <p style="margin: 8px 0; color: #34495e;"><strong>Duración:</strong> 30 minutos</p>
                </div>
                
                
                <div style="background-color: #2c3e50; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
                  <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px;">🔗 Enlace de Google Meet</h3>
                  <a href="${meetLink}" style="display: inline-block; background-color: white; color: #2c3e50; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                    Unirse a la Reunión
                  </a>
                  <p style="color: white; margin: 15px 0 0 0; font-size: 14px;">
                    Enlace: <a href="${meetLink}" style="color: white; text-decoration: underline;">${meetLink}</a>
                  </p>
                </div>
                
                <div style="background-color: #f39c12; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px;">📋 Instrucciones Importantes</h3>
                  <ul style="color: white; margin: 0; padding-left: 20px;">
                    <li style="margin: 5px 0;">El día de la cita, haz clic en el enlace de Google Meet</li>
                    <li style="margin: 5px 0;">Asegúrate de tener una buena conexión a internet</li>
                    <li style="margin: 5px 0;">Si tienes problemas técnicos, contacta al +34 123 456 789</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
                  <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
                    ¡Esperamos verte pronto!<br>
                    <strong>Equipo de Consultas de Visa</strong>
                  </p>
                </div>
              </div>
            </div>
          `,
          attachments: [
            {
              filename: `consulta-visa-${selected_date || 'cita'}.ics`,
              content: icsContent,
              contentType: 'text/calendar; charset=utf-8'
            }
          ]
        };

        // Verificar si tenemos configuración real de email
        const hasRealConfig = process.env.EMAIL_USER && 
                             process.env.EMAIL_PASS && 
                             process.env.EMAIL_PASS !== 'tu_app_password_aqui';

        if (!hasRealConfig) {
          console.log("⚠️ No hay configuración real de email, solo logueando");
          console.log("📧 Email de invitación que se habría enviado al cliente:");
          console.log("   Para:", clientEmail);
          console.log("   Asunto:", clientSubject);
          console.log("   Enlace Meet:", meetLink);
          console.log("   Archivo .ics generado:", icsContent.substring(0, 200) + "...");
        } else {
          console.log("📧 Enviando email de invitación real al cliente...");
          // Enviar el email real al cliente
          const clientResult = await transporter.sendMail(clientMailOptions);
          console.log("✅ Email de invitación al cliente enviado exitosamente!");
          console.log("📧 Message ID:", clientResult.messageId);
          console.log("📧 Response:", clientResult.response);
          console.log("🔗 Enlace de Google Meet generado:", meetLink);
          console.log("📅 Archivo .ics generado y adjunto");
        }
        
      } catch (emailError) {
        console.error("❌ Error enviando email de invitación al cliente:", emailError);
        // No lanzamos el error para no afectar el webhook
      }
    }
  } catch (e) {
    console.error("Error en webhook:", e);
    return NextResponse.json({ received: true, error: true });
  }
  return NextResponse.json({ received: true });
}