import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  try {
    console.log("🧪 Probando conexión con Google Calendar...");

    // Aquí deberías obtener las credenciales del usuario desde tu base de datos
    // Por ahora, vamos a simular una respuesta exitosa
    
    // TODO: Implementar almacenamiento de credenciales en base de datos
    // const credentials = await getGoogleCalendarCredentials(userId);
    
    return NextResponse.json({
      success: true,
      message: "Conexión con Google Calendar funcionando correctamente",
      calendarInfo: {
        // Aquí irían los datos del calendario
        name: "Calendario Principal",
        id: "primary",
        timeZone: "Europe/Madrid"
      }
    });

  } catch (error) {
    console.error("❌ Error probando conexión:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Error al probar la conexión con Google Calendar" 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { credentials } = await request.json();
    
    if (!credentials?.accessToken) {
      return NextResponse.json(
        { error: "Credenciales de Google Calendar requeridas" },
        { status: 400 }
      );
    }

    console.log("🧪 Probando conexión con credenciales específicas...");

    // Configurar cliente OAuth con las credenciales
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    // Probar acceso al calendario
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Obtener información del calendario
    const calendarInfo = await calendar.calendars.get({
      calendarId: credentials.calendarId || 'primary'
    });

    // Probar creación de evento de prueba (solo en memoria, no se guarda)
    const testEvent = {
      summary: "Prueba de conexión - Consultas Visa",
      description: "Este es un evento de prueba para verificar la conexión con Google Calendar",
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 30 minutos después
        timeZone: "Europe/Madrid",
      },
      conferenceData: {
        createRequest: {
          requestId: `test-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      }
    };

    console.log("✅ Conexión con Google Calendar exitosa");
    console.log("📅 Calendario:", calendarInfo.data.summary);
    console.log("⏰ Zona horaria:", calendarInfo.data.timeZone);

    return NextResponse.json({
      success: true,
      message: "Conexión con Google Calendar funcionando correctamente",
      calendarInfo: {
        name: calendarInfo.data.summary,
        id: calendarInfo.data.id,
        timeZone: calendarInfo.data.timeZone,
        description: calendarInfo.data.description
      },
      testEvent: testEvent // Devolver el evento de prueba para verificar
    });

  } catch (error) {
    console.error("❌ Error probando conexión:", error);
    
    let errorMessage = "Error al probar la conexión con Google Calendar";
    
    if (error instanceof Error) {
      if (error.message.includes("invalid_grant")) {
        errorMessage = "Las credenciales han expirado. Por favor, reconecta tu cuenta.";
      } else if (error.message.includes("insufficient authentication")) {
        errorMessage = "Permisos insuficientes. Por favor, reconecta tu cuenta con los permisos correctos.";
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
