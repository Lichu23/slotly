"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@clerk/nextjs';
import AdminNavigation from "../AdminNavigation";

interface AnalyticsData {
  totalBookings: number;
  bookingsByMonth: Array<{
    month: string;
    count: number;
  }>;
  bookingsByVisaType: Array<{
    visaType: string;
    count: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  averageBookingTime: number;
  conversionRate: number;
  hasData: boolean;
  noDataMessage?: string;
}

export default function AdminAnalytics() {
  const { user, isLoaded } = useUser();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30"); // días
  const router = useRouter();

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics?days=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/admin/login");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, loadAnalytics]);

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
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Analytics y Reportes</h1>
              <p className="text-gray-600">Análisis detallado del rendimiento del sistema</p>
            </div>
            <AdminNavigation />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-2">
                Período de Análisis
              </label>
              <select
                id="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="365">Último año</option>
              </select>
            </div>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando analytics...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* No Data Message */}
            {!analytics.hasData && analytics.noDataMessage && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-yellow-800 mb-2">Sin Datos Disponibles</h3>
                <p className="text-yellow-700">{analytics.noDataMessage}</p>
                <p className="text-sm text-yellow-600 mt-2">
                  Los datos aparecerán aquí una vez que tengas reservas confirmadas.
                </p>
              </div>
            )}

            {/* Key Metrics - Solo mostrar si hay datos */}
            {analytics.hasData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">📊</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Reservas</p>
                      <p className="text-2xl font-semibold text-gray-900">{analytics.totalBookings}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">⏱️</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Tiempo Promedio</p>
                      <p className="text-2xl font-semibold text-gray-900">{analytics.averageBookingTime} min</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">📈</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Tasa de Conversión</p>
                      <p className="text-2xl font-semibold text-gray-900">{analytics.conversionRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">💰</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
                      <p className="text-2xl font-semibold text-gray-900">€{analytics.revenueByMonth.reduce((sum, item) => sum + item.revenue, 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Grid - Solo mostrar si hay datos */}
            {analytics.hasData && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bookings by Month */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Reservas por Mes</h3>
                    <div className="space-y-3">
                      {analytics.bookingsByMonth.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.month}</span>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${(item.count / Math.max(...analytics.bookingsByMonth.map(b => b.count))) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bookings by Visa Type */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Reservas por Tipo de Visa</h3>
                    <div className="space-y-3">
                      {analytics.bookingsByVisaType.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.visaType}</span>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${(item.count / Math.max(...analytics.bookingsByVisaType.map(b => b.count))) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ingresos por Mes</h3>
                  <div className="space-y-3">
                    {analytics.revenueByMonth.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{item.month}</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(item.revenue / Math.max(...analytics.revenueByMonth.map(r => r.revenue))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">€{item.revenue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No hay datos disponibles para el período seleccionado</p>
          </div>
        )}
      </div>
    </div>
  );
}

