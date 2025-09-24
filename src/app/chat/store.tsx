"use client";

import { create } from "zustand";
import { FormMessage } from "./FormMessage";
import { CalendarMessage } from "./CalendarMessage";
import { TimeSlotsMessage } from "./TimeSlotsMessage";

export type VisaType = "estudio" | "nomada" | "trabajo" | null;

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
  mode: "idle" | "asking" | "calendar" | "times" | "form";
  ensureBootstrapped: () => void;
  sendUserMessage: (text: string) => void;
  selectVisa: (visa: Exclude<VisaType, null>) => void;
  selectDate: (dateISO: string) => void;
  selectTime: (time: string) => void;
  getConversationSummary: () => string;
  getAISummary: () => Promise<string>;
};

const VISA_OPTIONS = [
  { key: "trabajo", label: "Visa de Trabajo" },
  { key: "estudio", label: "Visa de Estudio" },
  { key: "nomada", label: "Nómada Digital" },
  { key: "unknown", label: "No lo sé" },
] as const;

function buildOptionsBlock(onClick: (k: string) => void): React.ReactNode {
  return (
    <div className="flex flex-wrap gap-2">
      {VISA_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onClick(opt.key)}
          type="button"
          className="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isBootstrapped: false,
  isBotTyping: false,
  selectedVisa: null,
  mode: "idle",

  ensureBootstrapped: () => {
    if (get().isBootstrapped) return;
    // All messages originate from AI responses. Start by asking via AI what opción elegir.
    set({ isBootstrapped: true, mode: "asking" });
    (async () => {
      const first: ChatMessage = { id: `ai-welcome-${Date.now()}`, role: "bot", text: "Hola, ¿tu objetivo principal es estudiar, trabajar remotamente o empleo en España?", createdAt: Date.now() };
      set((s) => ({ messages: [...s.messages, first] }));
    })();
  },

  sendUserMessage: (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Client-side guard: refuse off-topic quickly
    const offTopic = /\b(refund|crypto|love|poem|song|joke|linux|windows key|serial|vpn|movie|recipe)\b/i.test(trimmed);
    if (offTopic) {
      const warn: ChatMessage = { id: `warn-${Date.now()}`, role: "bot", text: "Solo puedo ayudarte con visas de España: ¿estudiar, trabajar remotamente o empleo?", createdAt: Date.now() };
      set((s) => ({ messages: [...s.messages, { id: `u-${Date.now()}`, role: "user", text: trimmed, createdAt: Date.now() }, warn ] }));
      return;
    }
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed, createdAt: Date.now() };
    set((s) => ({ messages: [...s.messages, userMsg] }));

    const { mode } = get();
    if (mode === "asking") {
      // Simple rule-based routing
      const lower = trimmed.toLowerCase();
      if (lower.includes("estudi")) {
        get().selectVisa("estudio");
      } else if (lower.includes("tele") || lower.includes("remot") || lower.includes("nómada") || lower.includes("nomada")) {
        get().selectVisa("nomada");
      } else if (lower.includes("emple") || lower.includes("trabaj")) {
        get().selectVisa("trabajo");
      } else {
        // Try Ollama local endpoint first
        (async () => {
          try {
            set({ isBotTyping: true });
            const history = get().messages.map((m) => ({ role: m.role === "bot" ? "assistant" as const : "user" as const, content: m.text }));
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ history }),
            });
            if (res.ok) {
              const d = await res.json();
              const txt: string = d.response || "";
              // naive parse
              if (txt.includes("\"visa\"")) {
                if (/estudio/.test(txt)) return get().selectVisa("estudio");
                if (/nomada|nómada/.test(txt)) return get().selectVisa("nomada");
                if (/trabajo|empleo/.test(txt)) return get().selectVisa("trabajo");
              }
              const questionMatch = txt.match(/\"pregunta\"\s*:\s*\"([^\"]+)/);
              const reply = questionMatch?.[1] || txt.trim() || "¿Puedes contarme el propósito principal del viaje?";
              const follow: ChatMessage = { id: `ask-ollama-${Date.now()}`, role: "bot", text: reply, createdAt: Date.now() };
              set((s) => ({ messages: [...s.messages, follow], isBotTyping: false }));
              return;
            }
          } catch {}
          // Fallback static follow-up
          const followUp: ChatMessage = {
            id: `ask-2`,
            role: "bot",
            text: "Entiendo. ¿Tu plan principal es estudiar, trabajar por cuenta propia/remoto, o trabajar para una empresa en España?",
            createdAt: Date.now(),
          };
          set((s) => ({ messages: [...s.messages, followUp], isBotTyping: false }));
        })();
      }
    }
  },

  selectVisa: (visa) => {
    set({ selectedVisa: visa, mode: "calendar" });
    const confirmation: ChatMessage = {
      id: `visa-${visa}`,
      role: "bot",
      text: `Perfecto. Elige una fecha para tu consulta (${visa}).`,
      createdAt: Date.now(),
    };
    const calendarMsg: ChatMessage = {
      id: `cal-${Date.now()}`,
      role: "bot",
      text: "",
      render: <CalendarMessage onSelect={(d) => get().selectDate(d)} />,
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, confirmation, calendarMsg] }));
  },

  selectDate: (dateISO: string) => {
    set({ mode: "times" });
    const askTime: ChatMessage = {
      id: `t-ask-${Date.now()}`,
      role: "bot",
      text: `Fecha seleccionada: ${dateISO}. Elige un horario disponible:`,
      createdAt: Date.now(),
    };
    const timesMsg: ChatMessage = {
      id: `t-${Date.now()}`,
      role: "bot",
      text: "",
      render: <TimeSlotsMessage onPick={(time) => get().selectTime(time)} />,
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, askTime, timesMsg] }));
  },

  selectTime: (time: string) => {
    set({ mode: "form" });
    const info: ChatMessage = {
      id: `time-${Date.now()}`,
      role: "bot",
      text: `Horario seleccionado: ${time}. Completa el formulario para finalizar.`,
      createdAt: Date.now(),
    };
    const visa = get().selectedVisa as Exclude<VisaType, null>;
    (async () => {
      const summary = await get().getAISummary().catch(() => get().getConversationSummary());
      const form: ChatMessage = {
        id: `form-${visa}-${Date.now()}`,
        role: "bot",
        text: "",
        render: <FormMessage visaType={visa} presetComment={summary} />,
        createdAt: Date.now(),
      };
      set((s) => ({ messages: [...s.messages, info, form] }));
    })();
  },

  getConversationSummary: () => {
    const msgs = get().messages.filter((m) => m.role === "user" || m.role === "bot");
    const lastN = msgs.slice(-10).map((m) => `${m.role === "user" ? "Usuario" : "Bot"}: ${m.text}`).join("\n");
    return `Resumen de la conversación:\n${lastN}`;
  },

  getAISummary: async () => {
    const history = get().messages.map((m) => ({ role: m.role === "bot" ? "assistant" as const : "user" as const, content: m.text }));
    const prompt = `Genera un RESUMEN breve y útil para un consultor de inmigración sobre la conversación previa. Usa viñetas claras: objetivos del usuario, situación actual, dudas clave, recomendación preliminar. Responde solo texto.`;
    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: (process.env.OLLAMA_MODEL as string) || "qwen2.5:0.5b", prompt: `${prompt}\n\nHistorial:\n${history.map(h=>h.role+": "+h.content).join("\n")}`, stream: false }),
      });
      if (!res.ok) throw new Error("ollama not available");
      const data = await res.json();
      return String(data.response || "").trim().slice(0, 1200);
    } catch {
      return get().getConversationSummary();
    }
  },
}));


