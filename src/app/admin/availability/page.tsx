"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "../store";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from '@clerk/nextjs';
import AdminNavigation from "../AdminNavigation";

interface AvailabilitySlot {
  id: number;
  date: string;
  time_slot: string;
  is_available: boolean;
  max_bookings: number;
  current_bookings: number;
  created_at: string;
}

export default function AdminAvailability() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [newSlotTime, setNewSlotTime] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/admin/login");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (user) {
      loadSlots();
    }
  }, [user, selectedDate]);

  const loadSlots = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/availability?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setSlots(data);
      }
    } catch (error) {
      console.error("Error loading slots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSlotAvailability = async (slotId: number, isAvailable: boolean) => {
    try {
      const response = await fetch(`/api/admin/availability/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !isAvailable }),
      });

      if (response.ok) {
        await loadSlots();
      }
    } catch (error) {
      console.error("Error updating slot:", error);
    }
  };

  const addNewSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotTime) return;

    try {
      const response = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time_slot: newSlotTime,
        }),
      });

      if (response.ok) {
        setNewSlotTime("");
        setShowAddForm(false);
        await loadSlots();
      }
    } catch (error) {
      console.error("Error adding slot:", error);
    }
  };

  const deleteSlot = async (slotId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este slot?")) return;

    try {
      const response = await fetch(`/api/admin/availability/${slotId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadSlots();
      }
    } catch (error) {
      console.error("Error deleting slot:", error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
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
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Disponibilidad</h1>
              <p className="text-gray-600">Administra los horarios disponibles para consultas</p>
            </div>
            <AdminNavigation />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Fecha
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              {showAddForm ? "Cancelar" : "Agregar Slot"}
            </button>
            <button
              onClick={loadSlots}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Actualizar
            </button>
          </div>

          {/* Add Slot Form */}
          {showAddForm && (
            <form onSubmit={addNewSlot} className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                    Hora del Slot
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Slots Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando slots...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reservas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {slots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {slot.time_slot}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          slot.is_available 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {slot.is_available ? 'Disponible' : 'Ocupado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.current_bookings} / {slot.max_bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleSlotAvailability(slot.id, slot.is_available)}
                            className={`${
                              slot.is_available 
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {slot.is_available ? 'Ocupar' : 'Liberar'}
                          </button>
                          <button
                            onClick={() => deleteSlot(slot.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {slots.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No hay slots para esta fecha
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
