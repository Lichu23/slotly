"use client";

import { useState, useEffect } from "react";

interface AvailableDate {
  date: string;
  hasSlots: boolean;
  availableSlots: number;
}

export function CustomCalendarMessage({ onSelect }: { onSelect: (dateISO: string) => void }) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar fechas disponibles usando la nueva API optimizada
    const loadAvailableDates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/availability/dates');
        
        if (response.ok) {
          const data = await response.json();
          setAvailableDates(data.dates || []);
        } else {
          console.error('Error loading available dates');
          setAvailableDates([]);
        }
      } catch (error) {
        console.error('Error loading available dates:', error);
        setAvailableDates([]);
      } finally {
        setLoading(false);
      }
    };

    loadAvailableDates();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onSelect(selectedDate);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        <span className="ml-2">Cargando fechas disponibles...</span>
      </div>
    );
  }

  if (availableDates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No hay fechas disponibles en este momento.</p>
        <p className="text-sm text-gray-500 mt-2">Por favor, intenta más tarde.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Selecciona una fecha disponible:</h3>
        <p className="text-sm text-gray-600">
          Mostrando {availableDates.length} fechas con horarios disponibles
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {availableDates.map((dateInfo) => (
          <button
            key={dateInfo.date}
            type="button"
            onClick={() => handleDateSelect(dateInfo.date)}
            className={`p-3 rounded-md border text-sm font-medium transition-colors ${
              selectedDate === dateInfo.date
                ? "bg-black text-white border-black"
                : "border-gray-300 bg-white text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">{formatDate(dateInfo.date)}</div>
              <div className="text-xs opacity-75">
                {dateInfo.availableSlots} horario{dateInfo.availableSlots !== 1 ? 's' : ''}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedDate && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full px-4 py-3 rounded-md bg-black text-white font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors"
          >
            Confirmar fecha: {formatDate(selectedDate)}
          </button>
        </div>
      )}
    </div>
  );
}