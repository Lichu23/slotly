import { NextResponse } from "next/server";

// Simulamos almacenamiento en memoria (en producción, usar base de datos)
let adminGoogleCalendarCredentials: any = null;

export async function GET() {
  try {
    console.log("🔍 Obteniendo credenciales de Google Calendar del admin...");
    console.log("📊 Estado actual de credenciales:", {
      hasCredentials: !!adminGoogleCalendarCredentials,
      email: adminGoogleCalendarCredentials?.email,
      calendarId: adminGoogleCalendarCredentials?.calendarId
    });
    
    if (!adminGoogleCalendarCredentials) {
      console.log("⚠️ No hay credenciales de Google Calendar almacenadas");
      return NextResponse.json({ credentials: null });
    }

    console.log("✅ Credenciales encontradas para:", adminGoogleCalendarCredentials.email);
    return NextResponse.json({ credentials: adminGoogleCalendarCredentials });
  } catch (error) {
    console.error("❌ Error obteniendo credenciales:", error);
    return NextResponse.json({ error: "Error obteniendo credenciales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { credentials } = await request.json();
    
    console.log("📥 POST request recibido con credenciales:", {
      hasCredentials: !!credentials,
      email: credentials?.email,
      calendarId: credentials?.calendarId,
      hasAccessToken: !!credentials?.accessToken,
      hasRefreshToken: !!credentials?.refreshToken
    });
    
    if (!credentials) {
      console.log("❌ No se proporcionaron credenciales");
      return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 });
    }

    console.log("💾 Guardando credenciales de Google Calendar del admin...");
    console.log("📧 Email:", credentials.email);
    console.log("📅 Calendario:", credentials.calendarId);
    console.log("🔑 Access Token:", credentials.accessToken ? "✅ Presente" : "❌ Ausente");
    console.log("🔄 Refresh Token:", credentials.refreshToken ? "✅ Presente" : "❌ Ausente");
    
    // Guardar credenciales (en producción, esto iría a la base de datos)
    adminGoogleCalendarCredentials = credentials;
    
    console.log("✅ Credenciales guardadas exitosamente");
    console.log("📊 Estado después de guardar:", {
      hasCredentials: !!adminGoogleCalendarCredentials,
      email: adminGoogleCalendarCredentials?.email,
      calendarId: adminGoogleCalendarCredentials?.calendarId
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error guardando credenciales:", error);
    return NextResponse.json({ error: "Error guardando credenciales" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log("🗑️ Eliminando credenciales de Google Calendar del admin...");
    
    adminGoogleCalendarCredentials = null;
    
    console.log("✅ Credenciales eliminadas exitosamente");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error eliminando credenciales:", error);
    return NextResponse.json({ error: "Error eliminando credenciales" }, { status: 500 });
  }
}