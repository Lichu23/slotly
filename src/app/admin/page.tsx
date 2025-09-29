"use client";

import { useAdminStore } from "./store";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from '@clerk/nextjs';
import GoogleCalendarSetup from "./GoogleCalendarSetup";
import AdminNavigation from "./AdminNavigation";

export default function AdminPage() {
  const { 
    aiContext, 
    maxQuestions, 
    updateContext, 
    updateMaxQuestions, 
    saveConfig,
    loadConfig,
    googleCalendarConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar
  } = useAdminStore();
  
  const { user, isLoaded } = useUser();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/admin/login");
    }
  }, [isLoaded, user, router]);


  const handleSave = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      await saveConfig();
      setMessage("Configuración guardada exitosamente");
    } catch {
      setMessage("Error al guardar la configuración");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      await loadConfig();
      setMessage("Configuración cargada exitosamente");
    } catch {
      setMessage("Error al cargar la configuración");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Será redirigido por el useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-gray-600 text-sm sm:text-base">Bienvenido, {user?.firstName || user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <AdminNavigation />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Google Calendar Setup */}
        <GoogleCalendarSetup
          onConnect={connectGoogleCalendar}
          onDisconnect={disconnectGoogleCalendar}
          isConnected={googleCalendarConnected}
        />

        {/* AI Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg lg:text-2xl font-bold text-black mb-6 sm:mb-8">
            Configuración de IA
          </h2>
          
          <div className="space-y-6">
            {/* Contexto de IA */}
            <div>
              <label htmlFor="aiContext" className="block text-sm font-medium text-gray-700 mb-2">
                Contexto para la IA
              </label>
              <textarea
                id="aiContext"
                value={aiContext}
                onChange={(e) => updateContext(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                placeholder="Ingresa el contexto específico que quieres que la IA use para responder a los clientes sobre visas de España..."
              />
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Este contexto se enviará a la IA para que responda de manera más específica y útil.
              </p>
            </div>

            {/* Límite de preguntas */}
            <div>
              <label htmlFor="maxQuestions" className="block text-sm font-medium text-gray-700 mb-2">
                Máximo de preguntas antes de determinar visa
              </label>
              <input
                id="maxQuestions"
                type="number"
                min="1"
                max="10"
                value={maxQuestions}
                onChange={(e) => updateMaxQuestions(parseInt(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Después de este número de preguntas, la IA determinará automáticamente el tipo de visa y mostrará el formulario.
              </p>
            </div>

            {/* Mensaje de estado */}
            {message && (
              <div className={`p-4 rounded-md ${
                message.includes("Error") 
                  ? "bg-red-50 text-red-700 border border-red-200" 
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}>
                {message}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {isLoading ? "Guardando..." : "Guardar Configuración"}
              </button>
              
              <button
                onClick={handleLoad}
                disabled={isLoading}
                className="px-6 py-2 bg-white text-black border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {isLoading ? "Cargando..." : "Cargar Configuración"}
              </button>
            </div>

            {/* Vista previa del contexto */}
            <div className="mt-8">
              <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-3">
                Vista previa del contexto
              </h3>
              <div className="bg-gray-100 p-4 rounded-md">
                <pre className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
                  {aiContext || "No hay contexto configurado aún..."}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
