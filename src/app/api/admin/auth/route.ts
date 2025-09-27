import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Credenciales de administrador (en producción, usar autenticación real)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "admin123",
};

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 });
    }

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Crear token de sesión (en producción, usar JWT o similar)
      const sessionToken = Buffer.from(`${username}:${Date.now()}`).toString("base64");
      
      // Configurar cookie de sesión
      const cookieStore = await cookies();
      cookieStore.set("admin-session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60, // 24 horas
      });

      return NextResponse.json({ 
        message: "Autenticación exitosa",
        user: { username }
      });
    } else {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin-session");

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verificar token (en producción, validar JWT)
    try {
      const decoded = Buffer.from(sessionToken.value, "base64").toString("utf-8");
      const [username] = decoded.split(":");
      
      return NextResponse.json({ 
        authenticated: true,
        user: { username }
      });
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("admin-session");
    
    return NextResponse.json({ message: "Sesión cerrada exitosamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
