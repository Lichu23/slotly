"use client";

import { useState, useEffect } from "react";

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface CalendarProps {
  onDateSelect: (date: string, time: string, slotId?: string) => void;
  selectedDate?: string;
  selectedTime?: string;
}

export default function Calendar({ onDateSelect, selectedDate, selectedTime }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
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
    setLoadingTimeSlots(true);
    try {
      const response = await fetch(`/api/availability?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        const formattedSlots = (data.timeSlots || data.slots || []).map((slot: { id: string; time: string; available: boolean }) => ({
          id: slot.id,
          time: slot.time,
          available: slot.available
        }));
        setTimeSlots(formattedSlots);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoadingTimeSlots(false);
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

  // Scroll automático cuando el calendario se monta - enfoque más robusto
  useEffect(() => {
    if (!loading) {
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

      // Scroll del contenedor de mensajes
      setTimeout(performScroll, 100);
      setTimeout(performScroll, 400);
      setTimeout(performScroll, 700);
      
      // Scroll específico del calendario usando scrollIntoView
      setTimeout(() => {
        const calendarContainer = document.getElementById('calendar-component') ||
                                 document.querySelector('[class*="bg-white rounded-lg shadow-lg"]');
        
        if (calendarContainer) {
          calendarContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 500);
    }
  }, [loading]);

  // Función para crear string de fecha sin problemas de zona horaria
  const createDateString = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  // Generar días del mes
  const generateDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Fecha actual para comparaciones
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayString = createDateString(now.getFullYear(), now.getMonth(), now.getDate());

    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonth = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevMonth,
        isCurrentMonth: false,
        isAvailable: false,
        isSelected: false,
        isPast: true,
        isToday: false
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = createDateString(year, month, day);
      const isAvailable = availableDates.includes(dateString);
      const isSelected = selectedDateState === dateString;
      const isToday = dateString === todayString;
      const isPast = date < today;

      days.push({
        date,
        isCurrentMonth: true,
        isAvailable: isAvailable && (!isPast || isToday),
        isSelected,
        isPast: isPast && !isToday,
        isToday
      });
    }

    return days;
  };

  const handleDateClick = (date: Date) => {
    const dateString = createDateString(date.getFullYear(), date.getMonth(), date.getDate());
    const isAvailable = availableDates.includes(dateString);
    
    // Fecha actual para comparaciones
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayString = createDateString(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = dateString === todayString;
    const isPast = date < today;

    if (isAvailable && (!isPast || isToday)) {
      console.log('Selected date:', dateString); // Debug log
      setSelectedDateState(dateString);
      setSelectedTimeState(null);
      // Limpiar horarios anteriores para evitar parpadeo
      setTimeSlots([]);
    }
  };

  const handleTimeClick = (time: string, slotId: string) => {
    setSelectedTimeState(time);
    if (selectedDateState) {
      console.log('Selected time:', time, 'for date:', selectedDateState); // Debug log
      onDateSelect(selectedDateState, time, slotId);
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
    <div id="calendar-component" className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-4xl mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
        Seleccionar fecha y hora
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Calendario */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h4 className="text-base sm:text-lg font-medium text-gray-900">
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
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">
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
                disabled={!day.isAvailable}
                className={`
                  aspect-square p-1 sm:p-2 text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center
                  ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                  ${day.isPast && !day.isToday ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${day.isToday ? 'bg-blue-100 text-blue-700 font-medium' : ''}
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
        <div className="w-full">
          {selectedDateState ? (
            <div>
              <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
                Horarios disponibles para {new Date(selectedDateState).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h4>
              
              {loadingTimeSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600">Cargando horarios...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 sm:gap-3">
                {(() => {
                  if (timeSlots.length === 0) {
                    return (
                      <div className="col-span-2 sm:col-span-3 lg:col-span-2 text-center text-gray-500 py-6 sm:py-8 text-sm">
                        No hay horarios disponibles para esta fecha
                      </div>
                    );
                  }

                  // Filtrar horarios disponibles
                  const availableSlots = timeSlots.filter(slot => {
                    if (!slot.available) return false;
                    
                    // Si es hoy, filtrar horarios pasados
                    const now = new Date();
                    const todayString = createDateString(now.getFullYear(), now.getMonth(), now.getDate());
                    
                    if (selectedDateState === todayString) {
                      const currentTime = now.getHours() * 100 + now.getMinutes();
                      const slotTime = parseInt(slot.time.replace(':', ''));
                      return slotTime > currentTime;
                    }
                    
                    return true;
                  });

                  // Si no hay horarios disponibles después del filtrado
                  if (availableSlots.length === 0) {
                    return (
                      <div className="col-span-2 sm:col-span-3 lg:col-span-2 text-center py-6 sm:py-8">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center justify-center mb-2">
                            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <p className="text-red-700 font-medium text-sm mb-1">No hay horarios disponibles</p>
                          <p className="text-red-600 text-xs">Todos los horarios para este día están reservados</p>
                        </div>
                      </div>
                    );
                  }

                  // Mostrar horarios disponibles
                  return availableSlots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => handleTimeClick(slot.time, slot.id)}
                      className={`
                        p-2 sm:p-3 rounded-lg border-2 transition-colors text-xs sm:text-sm font-medium
                        ${selectedTimeState === slot.time
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                        }
                      `}
                    >
                      {slot.time}
                    </button>
                  ));
                })()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6 sm:py-8 text-sm">
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
