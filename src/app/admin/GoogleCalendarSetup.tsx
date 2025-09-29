"use client";

import { useState } from "react";

interface GoogleCalendarSetupProps {
  onConnect: (credentials: GoogleCalendarCredentials) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}

export interface GoogleCalendarCredentials {
  accessToken: string;
  refreshToken: string;
  calendarId: string;
  email: string;
}

export default function GoogleCalendarSetup({ 
  onConnect, 
  onDisconnect, 
  isConnected 
}: GoogleCalendarSetupProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleGoogleAuth = async () => {
    setIsConnecting(true);
    setError("");
    setSuccess("");

    try {
      // Iniciar el proceso de OAuth con Google
      const response = await fetch("/api/google-calendar/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error al iniciar autenticación con Google");
      }

      const { authUrl } = await response.json();
      
      // Abrir ventana de OAuth
      const popup = window.open(
        authUrl,
        "google-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

      // Escuchar el mensaje de respuesta del popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
          onConnect(event.data.credentials);
          
          // Guardar credenciales en el servidor
          fetch("/api/admin/google-calendar-credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credentials: event.data.credentials }),
          }).then(response => {
            if (response.ok) {
              setSuccess("¡Conectado exitosamente con Google Calendar!");
            } else {
              setError("Error al guardar credenciales en el servidor");
            }
          }).catch(error => {
            console.error("Error guardando credenciales:", error);
            setError("Error al guardar credenciales en el servidor");
          });
          
          popup?.close();
          window.removeEventListener("message", messageListener);
        } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
          setError(event.data.error || "Error al conectar con Google Calendar");
          popup?.close();
          window.removeEventListener("message", messageListener);
        }
      };

      window.addEventListener("message", messageListener);

      // Limpiar listener si la ventana se cierra manualmente
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          window.removeEventListener("message", messageListener);
          clearInterval(checkClosed);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Eliminar credenciales del servidor
      await fetch("/api/admin/google-calendar-credentials", {
        method: "DELETE",
      });
      
      // Desconectar de Google (opcional)
      await fetch("/api/google-calendar/disconnect", {
        method: "POST",
      });
      
      onDisconnect();
      setSuccess("Desconectado exitosamente de Google Calendar");
    } catch (error) {
      setError("Error al desconectar de Google Calendar");
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch("/api/google-calendar/test");
      if (response.ok) {
        setSuccess("¡Conexión con Google Calendar funcionando correctamente!");
      } else {
        setError("Error al probar la conexión con Google Calendar");
      }
    } catch (error) {
      setError("Error al probar la conexión");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h2 className="text-xl lg:text-2xl font-bold text-black mb-6">
        📅 Configuración de Google Calendar
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-md">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Estado de conexión */}
        <div className="flex items-center space-x-4">
          <div className={`lg:w-3 lg:h-3 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm lg:text-lg font-medium">
            {isConnected ? "Conectado con Google Calendar" : "No conectado con Google Calendar"}
          </span>
        </div>

        {/* Información sobre la integración */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2">
            ¿Qué hace esta integración?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Crea eventos automáticamente en tu Google Calendar</li>
            <li>• Los clientes reciben enlaces de Google Meet reales</li>
            <li>• Sincronización automática con tu calendario</li>
            <li>• Recordatorios automáticos para ambos</li>
          </ul>
        </div>

        {/* Permisos requeridos */}
        <div className="bg-yellow-50 p-4 rounded-md">
          <h3 className="font-medium text-yellow-900 mb-2">
            Permisos que solicitaremos:
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Ver y editar eventos en tu calendario</li>
            <li>• Crear eventos con enlaces de Google Meet</li>
            <li>• Enviar invitaciones por email</li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-4">
          {!isConnected ? (
            <button
              onClick={handleGoogleAuth}
              disabled={isConnecting}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Conectar con Google Calendar</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={testConnection}
                className="px-3 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                Probar Conexión
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Desconectar
              </button>
            </>
          )}
        </div>

        {/* Información adicional */}
        <div className="text-sm text-gray-600">
          <p>
            <strong>Nota:</strong> Esta integración utiliza OAuth 2.0 para conectarse de forma segura con tu cuenta de Google. 
            No almacenamos tu contraseña, solo los tokens de acceso necesarios para crear eventos en tu calendario.
          </p>
        </div>
      </div>
    </div>
  );
}