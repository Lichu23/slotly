"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';

export default function AdminNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const navigationItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'Disponibilidad', href: '/admin/availability', icon: '📅' },
    { name: 'Reservas', href: '/admin/bookings', icon: '📋' },
    { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { name: 'Configuración IA', href: '/admin', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push('/admin/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navigateTo = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu - All Devices */}
      <div className="flex items-center">
        {/* Hamburger Button */}
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            className={`w-6 h-6 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Menu Overlay - All Devices */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <div className="fixed top-0 right-0 h-full w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Info */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                      </p>
                      <p className="text-xs text-gray-500">Administrador</p>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto">
                  <nav className="p-4 space-y-2">
                    {navigationItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => navigateTo(item.href)}
                        className="w-full flex items-center space-x-3 px-3 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Footer */}
                <div className="p-4 border-t">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-medium">Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Info in Header - Always Visible */}
        <div className="ml-4 flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-gray-700 hidden sm:block">
            {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          </span>
        </div>
      </div>
    </>
  );
}
