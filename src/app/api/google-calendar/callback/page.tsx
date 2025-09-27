"use client";

import { useEffect, useState } from "react";

export default function GoogleCalendarCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        if (error) {
          throw new Error(`Error de autorización: ${error}`);
        }

        if (!code) {
          throw new Error("No se recibió código de autorización");
        }

        // Enviar código al servidor para intercambiarlo por tokens
        const response = await fetch("/api/google-calendar/auth", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al obtener credenciales");
        }

        const { credentials } = await response.json();

        // Enviar credenciales al padre
        window.opener?.postMessage({
          type: "GOOGLE_AUTH_SUCCESS",
          credentials,
        }, window.location.origin);

        setStatus("success");
        setMessage("¡Conectado exitosamente con Google Calendar!");
        
        // Cerrar ventana después de un momento
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        console.error("Error en callback:", error);
        
        // Enviar error al padre
        window.opener?.postMessage({
          type: "GOOGLE_AUTH_ERROR",
          error: error instanceof Error ? error.message : "Error desconocido",
        }, window.location.origin);

        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Error desconocido");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Conectando con Google Calendar...
              </h2>
              <p className="text-gray-600">
                Por favor espera mientras configuramos tu cuenta.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                ¡Conectado exitosamente!
              </h2>
              <p className="text-green-700">
                Tu cuenta de Google Calendar ha sido configurada correctamente.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                Error de conexión
              </h2>
              <p className="text-red-700 mb-4">
                {message}
              </p>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
