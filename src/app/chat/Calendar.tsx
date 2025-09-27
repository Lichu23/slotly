"use client";

import { useState, useEffect } from "react";

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  date: string;
}

interface CalendarProps {
  onDateSelect: (date: string, time: string) => void;
  selectedDate?: string;
  selectedTime?: string;
}

export default function Calendar({ onDateSelect, selectedDate, selectedTime }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateState, setSelectedDateState] = useState<string | null>(selectedDate || null);
  const [selectedTimeState, setSelectedTimeState] = useState<string | null>(selectedTime || null);

  // Obtener fechas disponibles
  const fetchAvailableDates = async () => {
    try {
      const response = await fetch('/api/availability');
      if (response.ok) {
        const data = await response.json();
        setAvailableDates(data.availableDates || []);
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
    }
  };

  // Obtener horarios disponibles para una fecha específica
  const fetchTimeSlots = async (date: string) => {
    try {
      const response = await fetch(`/api/availability?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.timeSlots || []);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  useEffect(() => {
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDateState) {
      fetchTimeSlots(selectedDateState);
    }
  }, [selectedDateState]);

  useEffect(() => {
    setLoading(false);
  }, [availableDates]);

  // Generar días del mes
  const generateDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonth = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevMonth,
        isCurrentMonth: false,
        isAvailable: false
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const isAvailable = availableDates.includes(dateString);
      const isSelected = selectedDateState === dateString;
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

      days.push({
        date,
        isCurrentMonth: true,
        isAvailable: isAvailable && !isPast,
        isSelected,
        isPast
      });
    }

    return days;
  };

  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const isAvailable = availableDates.includes(dateString);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

    if (isAvailable && !isPast) {
      setSelectedDateState(dateString);
      setSelectedTimeState(null); // Reset time selection
    }
  };

  const handleTimeClick = (time: string) => {
    setSelectedTimeState(time);
    if (selectedDateState) {
      onDateSelect(selectedDateState, time);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
        Selecciona tu fecha y hora preferida
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendario */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h4 className="text-lg font-medium text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Días del calendario */}
          <div className="grid grid-cols-7 gap-1">
            {generateDays().map((day, index) => (
              <button
                key={index}
                onClick={() => handleDateClick(day.date)}
                disabled={!day.isAvailable || day.isPast}
                className={`
                  p-2 text-sm rounded-lg transition-colors
                  ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                  ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${day.isAvailable && !day.isPast ? 'hover:bg-blue-50 text-gray-700' : ''}
                  ${day.isSelected ? 'bg-blue-600 text-white font-medium' : ''}
                  ${!day.isAvailable && !day.isPast && day.isCurrentMonth ? 'text-gray-400 cursor-not-allowed' : ''}
                `}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>
        </div>

        {/* Horarios disponibles */}
        <div>
          {selectedDateState ? (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Horarios disponibles para {new Date(selectedDateState).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                {timeSlots.length > 0 ? (
                  timeSlots
                    .filter(slot => slot.available)
                    .map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => handleTimeClick(slot.time)}
                        className={`
                          p-3 rounded-lg border-2 transition-colors text-sm font-medium
                          ${selectedTimeState === slot.time
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                          }
                        `}
                      >
                        {slot.time}
                      </button>
                    ))
                ) : (
                  <div className="col-span-2 text-center text-gray-500 py-8">
                    No hay horarios disponibles para esta fecha
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Selecciona una fecha para ver los horarios disponibles
            </div>
          )}
        </div>
      </div>

      {/* Información de selección */}
      {selectedDateState && selectedTimeState && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 font-medium">
              Cita seleccionada: {new Date(selectedDateState).toLocaleDateString('es-ES')} a las {selectedTimeState}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
