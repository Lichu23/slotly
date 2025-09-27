# 📅 Configuración de Google Calendar

Esta guía te ayudará a configurar la integración con Google Calendar para que el sistema pueda crear eventos automáticamente con enlaces de Google Meet reales.

## 🔧 Configuración Inicial

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Calendar:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google Calendar API"
   - Haz clic en "Enable"

### 2. Configurar OAuth 2.0

1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configura la pantalla de consentimiento si es necesario
4. Selecciona "Web application"
5. Configura los URIs de redirección:
   - **Authorized redirect URIs**: `http://localhost:3000/api/google-calendar/callback` (desarrollo)
   - **Authorized redirect URIs**: `https://tu-dominio.com/api/google-calendar/callback` (producción)

### 3. Obtener Credenciales

1. Copia el **Client ID** y **Client Secret**
2. Agrega estas variables a tu archivo `.env.local`:

```env
GOOGLE_CLIENT_ID=tu-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
NEXTAUTH_URL=http://localhost:3000
```

## 🚀 Uso en el Panel de Admin

### 1. Acceder al Panel de Admin

1. Ve a `/admin`
2. Inicia sesión con tus credenciales
3. Verás la sección "📅 Configuración de Google Calendar"

### 2. Conectar con Google Calendar

1. Haz clic en "Conectar con Google Calendar"
2. Se abrirá una ventana de Google OAuth
3. Inicia sesión con tu cuenta de Google
4. Otorga los permisos necesarios:
   - Ver y editar eventos en tu calendario
   - Crear eventos con enlaces de Google Meet
   - Enviar invitaciones por email

### 3. Verificar Conexión

1. Haz clic en "Probar Conexión" para verificar que todo funciona
2. Verás un mensaje de éxito si la configuración es correcta

## 🔄 Funcionamiento Automático

Una vez configurado, el sistema:

1. **Recibe un pago** → Webhook de Stripe se activa
2. **Crea evento en Google Calendar** → Con enlace de Google Meet real
3. **Envía emails** → Con archivos .ics y enlaces de Meet
4. **Sincroniza automáticamente** → Con tu calendario personal

## 📋 Permisos Requeridos

El sistema solicita estos permisos:

- `https://www.googleapis.com/auth/calendar` - Ver y editar calendarios
- `https://www.googleapis.com/auth/calendar.events` - Crear eventos
- `https://www.googleapis.com/auth/calendar.settings.readonly` - Leer configuración
- `email` - Acceder a información del email
- `profile` - Acceder a información básica del perfil

## 🛠️ Solución de Problemas

### Error: "invalid_grant"
- Las credenciales han expirado
- **Solución**: Reconecta tu cuenta desde el panel de admin

### Error: "insufficient authentication"
- Permisos insuficientes
- **Solución**: Asegúrate de otorgar todos los permisos solicitados

### Error: "quotaExceeded"
- Se ha excedido la cuota de la API
- **Solución**: Espera o contacta a Google para aumentar la cuota

### No se crean eventos
- Verifica que la API de Google Calendar esté habilitada
- Confirma que las credenciales OAuth sean correctas
- Revisa los logs del servidor para más detalles

## 🔒 Seguridad

- Los tokens de acceso se almacenan de forma segura
- No se almacenan contraseñas, solo tokens OAuth
- Los tokens se pueden revocar desde Google en cualquier momento
- La conexión se puede desconectar desde el panel de admin

## 📞 Soporte

Si tienes problemas con la configuración:

1. Revisa los logs del servidor
2. Verifica que todas las variables de entorno estén configuradas
3. Confirma que los URIs de redirección sean correctos
4. Asegúrate de que la API de Google Calendar esté habilitada

---

**¡Listo!** 🎉 Ahora tu sistema puede crear eventos automáticamente en Google Calendar con enlaces de Google Meet reales.
