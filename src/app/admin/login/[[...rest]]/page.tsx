"use client";

import { SignIn } from '@clerk/nextjs';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panel de Administración
          </h1>
          <p className="text-gray-600">
            Inicia sesión para acceder al panel de administración
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-black hover:bg-gray-800 text-white',
                card: 'shadow-none',
                headerTitle: 'text-black',
                headerSubtitle: 'text-gray-600',
              }
            }}
            fallbackRedirectUrl="/admin"
            afterSignInUrl="/admin"
          />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500">
            ¿No tienes una cuenta? 
            <a href="/admin/register" className="text-black hover:underline ml-1">
              Regístrate aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
