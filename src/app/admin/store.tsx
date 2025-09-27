"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AdminConfig = {
  aiContext: string;
  maxQuestions: number;
};

export type AdminUser = {
  username: string;
};

export interface GoogleCalendarCredentials {
  accessToken: string;
  refreshToken: string;
  calendarId: string;
  email: string;
  name?: string;
}

type AdminState = {
  // Configuración
  aiContext: string;
  maxQuestions: number;
  
  // Google Calendar
  googleCalendarConnected: boolean;
  googleCalendarCredentials: GoogleCalendarCredentials | null;
  
  // Acciones de configuración
  updateContext: (context: string) => void;
  updateMaxQuestions: (max: number) => void;
  saveConfig: () => Promise<void>;
  loadConfig: () => Promise<void>;
  resetConfig: () => void;
  
  // Acciones de Google Calendar
  connectGoogleCalendar: (credentials: GoogleCalendarCredentials) => void;
  disconnectGoogleCalendar: () => void;
};

const defaultConfig: AdminConfig = {
  aiContext: "",
  maxQuestions: 1,
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      aiContext: defaultConfig.aiContext,
      maxQuestions: defaultConfig.maxQuestions,
      googleCalendarConnected: false,
      googleCalendarCredentials: null,

      // Acciones de configuración
      updateContext: (context: string) => {
        set({ aiContext: context });
      },

      updateMaxQuestions: (max: number) => {
        set({ maxQuestions: Math.max(1, Math.min(10, max)) });
      },

      saveConfig: async () => {
        const { aiContext, maxQuestions } = get();
        try {
          const response = await fetch("/api/admin/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiContext, maxQuestions }),
          });
          
          if (!response.ok) {
            throw new Error("Error al guardar configuración");
          }
        } catch (error) {
          console.error("Error saving config:", error);
          throw error;
        }
      },

      loadConfig: async () => {
        try {
          const response = await fetch("/api/admin/config");
          
          if (!response.ok) {
            throw new Error("Error al cargar configuración");
          }
          
          const config = await response.json();
          set({
            aiContext: config.aiContext || defaultConfig.aiContext,
            maxQuestions: config.maxQuestions || defaultConfig.maxQuestions,
          });
        } catch (error) {
          console.error("Error loading config:", error);
          throw error;
        }
      },

      resetConfig: () => {
        set(defaultConfig);
      },


      // Acciones de Google Calendar
      connectGoogleCalendar: (credentials: GoogleCalendarCredentials) => {
        set({
          googleCalendarConnected: true,
          googleCalendarCredentials: credentials,
        });
      },

      disconnectGoogleCalendar: () => {
        set({
          googleCalendarConnected: false,
          googleCalendarCredentials: null,
        });
      },
    }),
    {
      name: "admin-store",
      partialize: (state) => ({
        aiContext: state.aiContext,
        maxQuestions: state.maxQuestions,
        googleCalendarConnected: state.googleCalendarConnected,
        googleCalendarCredentials: state.googleCalendarCredentials,
      }),
    }
  )
);