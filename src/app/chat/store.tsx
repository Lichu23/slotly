"use client";

import { create } from "zustand";
import { FormMessage } from "./FormMessage";
import { CustomCalendarMessage } from "./CustomCalendarMessage";
import { CustomTimeSlotsMessage } from "./CustomTimeSlotsMessage";
import { DurationMessage } from "./DurationMessage";

export type VisaType = "estudio" | "nomada" | "trabajo" | "general" | null;

export type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  render?: React.ReactNode;
  createdAt: number;
};

type ChatState = {
  messages: ChatMessage[];
  isBootstrapped: boolean;
  isBotTyping: boolean;
  selectedVisa: VisaType;
  mode: "idle" | "asking" | "duration" | "calendar" | "times" | "form";
  questionCount: number;
  adminConfig: { aiContext: string; maxQuestions: number } | null;
  selectedDuration: number | null;
  selectedPrice: number;
  selectedDate: string | null;
  selectedTime: string | null;
  selectedSlotId: string | null;
  ensureBootstrapped: () => void;
  sendUserMessage: (text: string) => void;
  selectVisa: (visa: Exclude<VisaType, null>) => void;
  selectGeneralConsultation: () => void;
  selectDuration: (duration: number, price: number) => void;
  selectDateAndTime: (dateISO: string, time: string, slotId?: string) => void;
  backToCalendar: () => void;
  getConversationSummary: () => string;
  getAISummary: () => Promise<string>;
  loadAdminConfig: () => Promise<void>;
  determineVisaAutomatically: () => Promise<void>;
  determineVisaFromFirstMessage: (text: string) => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isBootstrapped: false,
  isBotTyping: false,
  selectedVisa: null,
  mode: "idle",
  questionCount: 0,
  adminConfig: null,
  selectedDuration: null,
  selectedPrice: 25,
  selectedDate: null,
  selectedTime: null,

  ensureBootstrapped: () => {
    if (get().isBootstrapped) return;
    set({ isBootstrapped: true, mode: "asking" });
    (async () => {
      // Cargar configuración de admin
      await get().loadAdminConfig();
      
      // Mensaje inicial fijo - siempre el mismo
      const initialMessage = "¡Hola! 👋 Soy tu asistente especializado en visas para España. ¿Cuál es tu propósito en España?";
      
      const first: ChatMessage = { 
        id: `ai-welcome-${Date.now()}`, 
        role: "bot", 
        text: initialMessage, 
        createdAt: Date.now() 
      };
      set((s) => ({ messages: [...s.messages, first] }));
    })();
  },

  sendUserMessage: async (text: string) => {
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", text, createdAt: Date.now() };
    set((s) => ({ messages: [...s.messages, userMsg], isBotTyping: true }));

    try {
      // Determinar visa inmediatamente con el primer mensaje
      await get().determineVisaFromFirstMessage(text);
    } catch (error) {
      console.error("Error determining visa:", error);
      const errorMsg: ChatMessage = { 
        id: `error-${Date.now()}`, 
        role: "bot", 
        text: "Lo siento, hubo un error. Por favor, intenta de nuevo.", 
        createdAt: Date.now() 
      };
      set((s) => ({ messages: [...s.messages, errorMsg] }));
    } finally {
      set({ isBotTyping: false });
    }
  },

  selectVisa: (visa) => {
    set({ selectedVisa: visa, mode: "duration" });
    const visaNames = {
      estudio: "Visa de Estudiante",
      nomada: "Visa Nómada Digital", 
      trabajo: "Visa de Trabajo",
      general: "Consulta General"
    };
    const confirmation: ChatMessage = {
      id: `visa-${visa}`,
      role: "bot",
      text: `✅ Perfecto. He identificado que necesitas una **${visaNames[visa]}**. Ahora elige la duración de tu consulta:`,
      createdAt: Date.now(),
    };
    const durationMsg: ChatMessage = {
      id: `duration-${Date.now()}`,
      role: "bot",
      text: "",
      render: <DurationMessage onSelect={(duration, price) => get().selectDuration(duration, price)} />,
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, confirmation, durationMsg] }));
  },

  selectGeneralConsultation: () => {
    set({ selectedVisa: "general", mode: "duration" });
    const confirmation: ChatMessage = {
      id: `general-consultation`,
      role: "bot",
      text: `🤔 Entiendo. Te ayudo con una **consulta general** para determinar el mejor tipo de visa para tu situación. Elige la duración de tu consulta:`,
      createdAt: Date.now(),
    };
    const durationMsg: ChatMessage = {
      id: `duration-${Date.now()}`,
      role: "bot",
      text: "",
      render: <DurationMessage onSelect={(duration, price) => get().selectDuration(duration, price)} />,
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, confirmation, durationMsg] }));
  },

  selectDuration: (duration, price) => {
    set({ selectedDuration: duration, selectedPrice: price, mode: "calendar" });
    const calendarMsg: ChatMessage = {
      id: `cal-${Date.now()}`,
      role: "bot",
      text: "",
      render: <CustomTimeSlotsMessage onPick={(d, t) => get().selectDateAndTime(d, t)} />,
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, calendarMsg] }));
    
    // Scroll automático más robusto después de agregar el mensaje
    const performScroll = () => {
      // Intentar encontrar el contenedor de mensajes
      const messageList = document.querySelector('[data-testid="message-list"]') || 
                         document.querySelector('.cs-message-list') ||
                         document.querySelector('.overflow-y-auto') ||
                         document.querySelector('[class*="overflow-y-auto"]') ||
                         document.querySelector('.flex-1.overflow-y-auto');
      
      if (messageList) {
        // Scroll al final del contenedor
        messageList.scrollTo({
          top: messageList.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Fallback: scroll de la ventana
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }
    };

    // Intentar scroll múltiples veces con diferentes delays
    setTimeout(performScroll, 100);
    setTimeout(performScroll, 300);
    setTimeout(performScroll, 600);
    setTimeout(performScroll, 1000);
    
    // Intentar scroll específico al calendario cuando esté disponible
    setTimeout(() => {
      const calendarElement = document.getElementById('calendar-component') ||
                             document.querySelector('[class*="bg-white rounded-lg shadow-lg"]') ||
                             document.querySelector('.bg-white.rounded-lg.shadow-lg');
      
      if (calendarElement) {
        calendarElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 800);
  },

  selectDateAndTime: (dateISO: string, time: string, slotId?: string) => {
    set({ mode: "form", selectedDate: dateISO, selectedTime: time, selectedSlotId: slotId || null });
    
    const currentMessages = get().messages;
    const existingFormIndex = currentMessages.findIndex(m => m.id.startsWith('form-'));
    
    if (existingFormIndex !== -1) {
      // Si ya existe un formulario, actualizarlo en lugar de crear uno nuevo
      const visa = get().selectedVisa as Exclude<VisaType, null>;
      const { selectedPrice } = get();
      
      const updatedForm: ChatMessage = {
        id: currentMessages[existingFormIndex].id, // Mantener el mismo ID
        role: "bot",
        text: "",
        render: <FormMessage 
          visaType={visa} 
          presetComment="" 
          customPrice={selectedPrice}
          selectedDate={dateISO}
          selectedTime={time}
          selectedSlotId={slotId}
        />,
        createdAt: currentMessages[existingFormIndex].createdAt, // Mantener la fecha original
      };
      
      // Actualizar el mensaje del formulario existente
      const updatedMessages = [...currentMessages];
      updatedMessages[existingFormIndex] = updatedForm;
      set({ messages: updatedMessages });
      
      // Agregar mensaje de actualización
      const updateInfo: ChatMessage = {
        id: `datetime-update-${Date.now()}`,
        role: "bot",
        text: `📅 Fecha actualizada: ${new Date(dateISO).toLocaleDateString('es-ES')} a las ${time}`,
        createdAt: Date.now(),
      };
      set((s) => ({ messages: [...s.messages, updateInfo] }));
    } else {
      // Si no existe formulario, crear uno nuevo
      const visa = get().selectedVisa as Exclude<VisaType, null>;
      const { selectedPrice } = get();
      (async () => {
        const form: ChatMessage = {
          id: `form-${visa}-${Date.now()}`,
          role: "bot",
          text: "",
          render: <FormMessage 
            visaType={visa} 
            presetComment="" 
            customPrice={selectedPrice}
            selectedDate={dateISO}
            selectedTime={time}
            selectedSlotId={slotId}
          />,
          createdAt: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, form] }));
      })();
    }
  },

  backToCalendar: () => {
    set({ mode: "calendar" });
    // Remover los mensajes de horarios y volver al calendario
    const currentMessages = get().messages;
    const calendarMessage = currentMessages.find(m => m.id.startsWith('cal-'));
    
    if (calendarMessage) {
      // Mantener solo los mensajes hasta el calendario
      const calendarIndex = currentMessages.findIndex(m => m.id.startsWith('cal-'));
      const messagesUpToCalendar = currentMessages.slice(0, calendarIndex + 1);
      set({ messages: messagesUpToCalendar });
    }
  },


  getConversationSummary: () => {
    const msgs = get().messages.filter((m) => m.role === "user" || m.role === "bot");
    const lastN = msgs.slice(-10).map((m) => `${m.role === "user" ? "Usuario" : "Bot"}: ${m.text}`).join("\n");
    return lastN;
  },

  getAISummary: async () => {
    const summary = get().getConversationSummary();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          history: [{ role: "user", content: `Resume esta conversación en 2-3 líneas para el formulario: ${summary}` }],
          adminContext: get().adminConfig?.aiContext 
        }),
      });
      const data = await res.json();
      return data.response || summary;
    } catch {
      return summary;
    }
  },

  loadAdminConfig: async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const config = await res.json();
        set({ adminConfig: config });
      }
    } catch (error) {
      console.error("Error loading admin config:", error);
    }
  },

  determineVisaFromFirstMessage: async (text: string) => {
    try {
      // Primero verificar si es una respuesta de "no lo sé" o similar
      const lowerText = text.toLowerCase();
      const uncertainResponses = [
        "no lo sé", "no se", "no sé", "no lo se", "no se que", "no sé qué",
        "no estoy seguro", "no estoy segura", "no estoy segur", "no estoy segur",
        "no tengo claro", "no tengo idea", "no tengo ni idea",
        "no sé qué elegir", "no se que elegir", "no sé cuál", "no se cual",
        "ayuda", "help", "no entiendo", "no entiendo bien"
      ];
      
      const isUncertain = uncertainResponses.some(response => lowerText.includes(response));
      
      if (isUncertain) {
        get().selectGeneralConsultation();
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          history: [{ role: "user", content: text }],
          adminContext: get().adminConfig?.aiContext 
        }),
      });
      const data = await res.json();
      const response = data.response;
      
      try {
        const parsed = JSON.parse(response);
        if (parsed.visa) {
          const visa = parsed.visa as "estudio" | "nomada" | "trabajo";
          get().selectVisa(visa);
        } else {
          // Si no se puede determinar, usar visa por defecto basada en palabras clave
          if (lowerText.includes("estudiar") || lowerText.includes("estudio") || lowerText.includes("universidad")) {
            get().selectVisa("estudio");
          } else if (lowerText.includes("trabajar") || lowerText.includes("trabajo") || lowerText.includes("empleo")) {
            get().selectVisa("trabajo");
          } else if (lowerText.includes("nómada") || lowerText.includes("remoto") || lowerText.includes("freelance")) {
            get().selectVisa("nomada");
          } else {
            get().selectVisa("trabajo"); // Por defecto
          }
        }
      } catch {
        // Si no es JSON válido, usar lógica de palabras clave
        if (lowerText.includes("estudiar") || lowerText.includes("estudio") || lowerText.includes("universidad")) {
          get().selectVisa("estudio");
        } else if (lowerText.includes("trabajar") || lowerText.includes("trabajo") || lowerText.includes("empleo")) {
          get().selectVisa("trabajo");
        } else if (lowerText.includes("nómada") || lowerText.includes("remoto") || lowerText.includes("freelance")) {
          get().selectVisa("nomada");
        } else {
          get().selectVisa("trabajo"); // Por defecto
        }
      }
    } catch (error) {
      console.error("Error determining visa:", error);
      get().selectVisa("trabajo");
    }
  },

  determineVisaAutomatically: async () => {
    const summary = get().getConversationSummary();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          history: [{ role: "user", content: `Basándote en esta conversación, determina el tipo de visa: ${summary}` }],
          adminContext: get().adminConfig?.aiContext 
        }),
      });
      const data = await res.json();
      const response = data.response;
      
      try {
        const parsed = JSON.parse(response);
        if (parsed.visa) {
          const visa = parsed.visa as "estudio" | "nomada" | "trabajo";
          get().selectVisa(visa);
        }
      } catch {
        // Si no es JSON válido, usar visa por defecto
        get().selectVisa("trabajo");
      }
    } catch (error) {
      console.error("Error determining visa:", error);
      get().selectVisa("trabajo");
    }
  },
}));