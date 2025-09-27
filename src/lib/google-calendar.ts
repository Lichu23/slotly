import { google } from "googleapis";

interface GoogleCalendarCredentials {
  accessToken: string;
  refreshToken: string;
  calendarId: string;
  email: string;
  name?: string;
}

interface CreateEventData {
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  attendees: Array<{
    email: string;
    name?: string;
  }>;
}

export async function createGoogleCalendarEvent(
  credentials: GoogleCalendarCredentials,
  eventData: CreateEventData
): Promise<{ success: boolean; event?: any; meetLink?: string; error?: string }> {
  try {
    console.log("📅 Creando evento en Google Calendar...");

    // Configurar cliente OAuth
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    // Configurar cliente de Calendar
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Preparar evento
    const event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.startDateTime,
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: "Europe/Madrid",
      },
      attendees: eventData.attendees.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: "needsAction",
      })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 1 día antes
          { method: "popup", minutes: 15 }, // 15 minutos antes
        ],
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    };

    // Crear evento
    const createdEvent = await calendar.events.insert({
      calendarId: credentials.calendarId,
      resource: event,
      conferenceDataVersion: 1, // Habilitar Google Meet
      sendUpdates: "all", // Enviar notificaciones a todos los asistentes
    });

    if (!createdEvent.data.id) {
      throw new Error("No se pudo crear el evento");
    }

    // Obtener enlace de Google Meet
    const meetLink = createdEvent.data.conferenceData?.entryPoints?.[0]?.uri;

    console.log("✅ Evento creado exitosamente en Google Calendar");
    console.log("🆔 ID del evento:", createdEvent.data.id);
    console.log("🔗 Enlace Meet:", meetLink);

    return {
      success: true,
      event: {
        id: createdEvent.data.id,
        summary: createdEvent.data.summary,
        start: createdEvent.data.start,
        end: createdEvent.data.end,
        meetLink: meetLink,
        htmlLink: createdEvent.data.htmlLink,
        attendees: createdEvent.data.attendees,
        created: createdEvent.data.created,
        updated: createdEvent.data.updated,
      },
      meetLink: meetLink,
    };

  } catch (error) {
    console.error("❌ Error creando evento en Google Calendar:", error);
    
    let errorMessage = "Error al crear evento en Google Calendar";
    
    if (error instanceof Error) {
      if (error.message.includes("invalid_grant")) {
        errorMessage = "Las credenciales han expirado. Por favor, reconecta tu cuenta.";
      } else if (error.message.includes("insufficient authentication")) {
        errorMessage = "Permisos insuficientes para crear eventos.";
      } else if (error.message.includes("quotaExceeded")) {
        errorMessage = "Se ha excedido la cuota de la API de Google Calendar.";
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

// Función para obtener credenciales del admin
export async function getAdminGoogleCalendarCredentials(): Promise<GoogleCalendarCredentials | null> {
  try {
    // Obtener credenciales del servidor
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/google-calendar-credentials`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log("No se pudieron obtener las credenciales del servidor");
      return null;
    }

    const data = await response.json();
    
    if (!data.credentials) {
      console.log("No hay credenciales de Google Calendar configuradas");
      return null;
    }

    console.log("✅ Credenciales de Google Calendar obtenidas para:", data.credentials.email);
    return data.credentials;
  } catch (error) {
    console.error("Error obteniendo credenciales de Google Calendar:", error);
    return null;
  }
}
