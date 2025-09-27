import { NextResponse } from "next/server";
import { google } from "googleapis";

// Configuración de OAuth 2.0 para Google Calendar
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google-calendar/callback`
);

export async function POST() {
  try {
    console.log("🔐 Iniciando autenticación con Google Calendar...");

    // Generar URL de autorización
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.settings.readonly',
        'email',
        'profile'
      ],
      prompt: 'consent', // Forzar consentimiento para obtener refresh token
    });

    console.log("✅ URL de autorización generada:", authUrl);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("❌ Error generando URL de autorización:", error);
    return NextResponse.json(
      { error: "Error al generar URL de autorización" },
      { status: 500 }
    );
  }
}

// Función para intercambiar código de autorización por tokens
export async function PUT(request: Request) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: "Código de autorización requerido" },
        { status: 400 }
      );
    }

    console.log("🔄 Intercambiando código por tokens...");

    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error("No se pudo obtener access token");
    }

    // Configurar credenciales
    oauth2Client.setCredentials(tokens);

    // Obtener información del usuario
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    // Obtener lista de calendarios
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();

    // Buscar calendario principal o crear uno
    let primaryCalendar = calendarList.data.items?.find(cal => cal.primary);
    
    if (!primaryCalendar) {
      // Si no hay calendario principal, usar el primero disponible
      primaryCalendar = calendarList.data.items?.[0];
    }

    if (!primaryCalendar) {
      throw new Error("No se encontró ningún calendario");
    }

    const credentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      calendarId: primaryCalendar.id || 'primary',
      email: userInfo.data.email || '',
      name: userInfo.data.name || '',
    };

    console.log("✅ Credenciales obtenidas exitosamente");
    console.log("📧 Email:", credentials.email);
    console.log("📅 Calendario:", credentials.calendarId);

    return NextResponse.json({ 
      success: true, 
      credentials 
    });

  } catch (error) {
    console.error("❌ Error intercambiando código por tokens:", error);
    return NextResponse.json(
      { error: "Error al obtener credenciales de Google" },
      { status: 500 }
    );
  }
}
