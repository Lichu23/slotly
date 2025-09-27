# Configuración de Clerk para Autenticación de Admin

## 1. Configurar Clerk

### Crear cuenta en Clerk
1. Ve a [clerk.com](https://clerk.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto

### Configurar el proyecto
1. En el dashboard de Clerk, ve a "API Keys"
2. Copia tu **Publishable Key** y **Secret Key**

### Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto con estas variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxx

# Google Calendar Integration (ya configurado)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Configuration (opcional para pruebas)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Stripe Configuration (ya configurado)
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

**⚠️ IMPORTANTE:** 
- Reemplaza `pk_test_xxxxxxxxxx` y `sk_test_xxxxxxxxxx` con tus claves reales de Clerk
- Las claves de Google Calendar y Stripe ya están configuradas en tu proyecto

## 2. Configurar autenticación para admin

### Opción 1: Restricción por email
1. En el dashboard de Clerk, ve a "User & Authentication" > "Email, Phone, Username"
2. Desactiva "Allow sign ups"
3. Ve a "Restrictions" y agrega solo los emails que pueden ser admin

### Opción 2: Restricción por dominio
1. En "Restrictions", agrega tu dominio de email
2. Solo usuarios con emails de ese dominio podrán registrarse

### Opción 3: Invitaciones manuales
1. Ve a "Users" en el dashboard
2. Invita manualmente a los usuarios que serán admin

## 3. Personalizar la interfaz

### Cambiar la apariencia
Puedes personalizar los componentes de Clerk editando:
- `src/app/admin/login/page.tsx`
- `src/app/admin/register/page.tsx`

### Cambiar el tema
En los componentes SignIn y SignUp, puedes modificar la prop `appearance`:

```tsx
<SignIn 
  appearance={{
    elements: {
      formButtonPrimary: 'bg-black hover:bg-gray-800 text-white',
      card: 'shadow-none',
      headerTitle: 'text-black',
      headerSubtitle: 'text-gray-600',
    }
  }}
/>
```

## 4. Protección de rutas

El middleware ya está configurado para proteger todas las rutas `/admin/*`. 

### Rutas protegidas:
- `/admin` - Panel principal
- `/admin/dashboard` - Dashboard
- `/admin/availability` - Gestión de disponibilidad
- `/admin/analytics` - Analytics
- `/admin/config` - Configuración

### Rutas públicas:
- `/admin/login` - Página de login
- `/admin/register` - Página de registro

## 5. Usar la autenticación en componentes

```tsx
import { useUser, useClerk } from '@clerk/nextjs';

export default function AdminComponent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <div>No autenticado</div>;
  }

  return (
    <div>
      <p>Hola, {user.firstName}!</p>
      <button onClick={() => signOut()}>
        Cerrar sesión
      </button>
    </div>
  );
    }
```

## 6. Despliegue

### Variables de entorno en producción
Asegúrate de configurar las variables de entorno en tu plataforma de despliegue:

- Vercel: Ve a Settings > Environment Variables
- Netlify: Ve a Site Settings > Environment Variables
- Railway: Ve a Variables

### Dominios permitidos
En el dashboard de Clerk, ve a "Domains" y agrega tu dominio de producción.

## 7. Pruebas

### Probar el login
1. Ve a `http://localhost:3000/admin/login`
2. Registra una cuenta o inicia sesión
3. Deberías ser redirigido a `/admin`

### Probar la protección
1. Intenta acceder a `http://localhost:3000/admin` sin estar logueado
2. Deberías ser redirigido a `/admin/login`

## 8. Solución de Problemas

### Error: "auth(...).protect is not a function"
Si ves este error, significa que el middleware no está configurado correctamente. El middleware ya está corregido, pero asegúrate de:

1. **Reiniciar el servidor:**
   ```bash
   npm run dev
   ```

2. **Verificar que las variables de entorno estén configuradas:**
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
   CLERK_SECRET_KEY=sk_test_xxxxxxxxxx
   ```

### Error: "Invalid path: /admin(?!/(login|register)(.*))"
Este error indica que el patrón de regex no es válido para `createRouteMatcher`. El middleware ya está corregido usando rutas específicas en lugar de patrones complejos.

### Problema: Redirección a login después de autenticarse
Si te autenticas correctamente pero al navegar a otras rutas de admin te redirige a login, el problema está en el middleware. El middleware ya está configurado para:

- ✅ **Proteger todas las rutas** `/admin(.*)`
- ✅ **Excluir rutas públicas** `/admin/login(.*)` y `/admin/register(.*)`
- ✅ **Reconocer sesiones de Clerk** correctamente

### Error: "Missing publishableKey"
Este error indica que las variables de entorno de Clerk no están configuradas:

1. Crea el archivo `.env.local` en la raíz del proyecto
2. Agrega las variables de Clerk
3. Reinicia el servidor

### Error: "You are running in keyless mode"
Este es un mensaje informativo de Clerk. Significa que puedes probar Clerk sin configurar las claves, pero para funcionalidad completa necesitas las claves reales.

## 9. Funcionalidades disponibles

### Con Clerk integrado:
- ✅ Registro e inicio de sesión seguro
- ✅ Protección automática de rutas
- ✅ Gestión de sesiones
- ✅ Interfaz personalizable
- ✅ Integración con Google Calendar
- ✅ Panel de administración completo

### Próximos pasos:
- Configurar roles y permisos específicos
- Agregar autenticación de dos factores
- Integrar con base de datos para persistir configuraciones
