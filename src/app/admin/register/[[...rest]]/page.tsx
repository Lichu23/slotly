"use client";

import { SignUp } from '@clerk/nextjs';

export default function AdminRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registro de Administrador
          </h1>
          <p className="text-gray-600">
            Crea tu cuenta de administrador
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-black hover:bg-gray-800 text-white',
                card: 'shadow-none',
                headerTitle: 'text-black',
                headerSubtitle: 'text-gray-600',
              }
            }}
            fallbackRedirectUrl="/admin"
            afterSignUpUrl="/admin"
          />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500">
            ¿Ya tienes una cuenta? 
            <a href="/admin/login" className="text-black hover:underline ml-1">
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
