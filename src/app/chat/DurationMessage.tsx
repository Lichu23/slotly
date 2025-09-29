"use client";

import { useState, useEffect } from "react";

const DURATION_OPTIONS = [
  { value: 30, label: "30 minutos", price: 25 },
  { value: 60, label: "1 hora", price: 50 },
] as const;

export function DurationMessage({ onSelect }: { onSelect: (duration: number, price: number) => void }) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const handleDurationSelect = (duration: number, price: number) => {
    if (selectedDuration) return; // No permitir selección si ya hay una seleccionada
    setSelectedDuration(duration);
    onSelect(duration, price);
    
    // Scroll automático después de la selección - múltiples intentos
    const performScroll = () => {
      const messageList = document.querySelector('[data-testid="message-list"]') || 
                         document.querySelector('.cs-message-list') ||
                         document.querySelector('.overflow-y-auto') ||
                         document.querySelector('[class*="overflow-y-auto"]') ||
                         document.querySelector('.flex-1.overflow-y-auto');
      
      if (messageList) {
        messageList.scrollTo({
          top: messageList.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }
    };

    // Múltiples intentos de scroll
    setTimeout(performScroll, 100);
    setTimeout(performScroll, 300);
    setTimeout(performScroll, 600);
  };

  return (
    <div className="space-y-3 w-full">
      <div className="text-sm text-gray-600 mb-2">
        Selecciona la duración de tu consulta:
      </div>
      <div className="grid grid-cols-1 gap-3 w-full">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleDurationSelect(option.value, option.price)}
            disabled={selectedDuration !== null && selectedDuration !== option.value}
            className={`w-full px-4 py-3 rounded-md border text-base font-medium transition-colors ${
              selectedDuration === option.value
                ? "bg-black text-white border-black cursor-default"
                : selectedDuration !== null
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "border-gray-300 bg-white text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 cursor-pointer"
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{option.label}</span>
              <span className="font-bold">€{option.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}