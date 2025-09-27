# Guía de Pruebas del Sistema Completo

## 🚀 Sistema Implementado

### ✅ Funcionalidades Completadas:
1. **Autenticación con Clerk** - Login/registro seguro para admin
2. **Google Calendar Integration** - Eventos reales con Google Meet
3. **Componente de Calendario Mejorado** - Selección de fecha y hora en una sola interfaz
4. **Webhook de Stripe** - Creación automática de eventos en Google Calendar
5. **Emails con archivos .ics** - Invitaciones de calendario para cliente y owner

## 📋 Configuración Requerida

### 1. Variables de Entorno
Crea un archivo `.env.local` con:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxx

# Google Calendar (ya configurado)
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Email (opcional para pruebas)
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password

# Stripe (ya configurado)
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

### 2. Configurar Clerk
1. Ve a [clerk.com](https://clerk.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Copia las API keys a las variables de entorno
4. (Opcional) Configura restricciones de acceso

## 🧪 Pruebas del Sistema

### Prueba 1: Autenticación de Admin

1. **Iniciar el servidor:**
   ```bash
   npm run dev
   ```

2. **Acceder al admin:**
   - Ve a `http://localhost:3000/admin`
   - Deberías ser redirigido a `/admin/login`

3. **Registrarse/Iniciar sesión:**
   - Usa la interfaz de Clerk para registrarte
   - Completa el proceso de verificación
   - Deberías ser redirigido a `/admin`

4. **Verificar acceso:**
   - Deberías ver el panel de administración
   - Tu nombre/email debería aparecer en la esquina superior derecha

### Prueba 2: Conexión con Google Calendar

1. **Desde el panel de admin:**
   - Busca la sección "Google Calendar"
   - Haz clic en "Conectar con Google Calendar"

2. **Completar OAuth:**
   - Autoriza los permisos de Google Calendar
   - Completa el proceso de autenticación

3. **Verificar conexión:**
   - Deberías ver "Conectado exitosamente"
   - Haz clic en "Probar Conexión" para verificar

### Prueba 3: Componente de Calendario Mejorado

1. **Acceder al chat:**
   - Ve a `http://localhost:3000/chat`
   - Inicia una conversación

2. **Seleccionar tipo de visa:**
   - Elige cualquier tipo de visa
   - Selecciona duración y precio

3. **Usar el nuevo calendario:**
   - Verás un calendario interactivo
   - Selecciona una fecha disponible
   - Selecciona un horario disponible
   - La fecha y hora se seleccionan juntas

### Prueba 4: Flujo Completo de Reserva

1. **Completar el formulario:**
   - Llena todos los campos requeridos
   - Haz clic en "Reservar Cita"

2. **Proceso de pago:**
   - Completa el pago con Stripe
   - Usa tarjeta de prueba: `4242 4242 4242 4242`

3. **Verificar eventos creados:**
   - Revisa tu Google Calendar
   - Deberías ver un evento creado automáticamente
   - El evento debería incluir un enlace de Google Meet

4. **Verificar emails:**
   - Revisa el email del cliente
   - Revisa el email del owner (si está configurado)
   - Ambos deberían incluir archivos .ics adjuntos

## 🔍 Verificaciones Importantes

### En el Admin Panel:
- [ ] Login/logout funciona correctamente
- [ ] Google Calendar se conecta sin errores
- [ ] La interfaz es responsive y moderna

### En el Chat:
- [ ] El calendario muestra fechas disponibles
- [ ] La selección de fecha y hora es intuitiva
- [ ] El formulario se completa correctamente
- [ ] El pago se procesa exitosamente

### En Google Calendar:
- [ ] Se crean eventos automáticamente
- [ ] Los eventos incluyen información completa del cliente
- [ ] Los enlaces de Google Meet funcionan
- [ ] Los recordatorios están configurados

### En los Emails:
- [ ] El cliente recibe confirmación
- [ ] El owner recibe notificación
- [ ] Los archivos .ics se pueden abrir en calendarios
- [ ] Los enlaces de Google Meet funcionan

## 🐛 Solución de Problemas

### Error de autenticación:
- Verifica que las variables de Clerk estén configuradas
- Asegúrate de que el dominio esté permitido en Clerk

### Error de Google Calendar:
- Verifica que las credenciales de Google estén configuradas
- Asegúrate de que los permisos estén otorgados

### Error de pago:
- Verifica que las claves de Stripe estén configuradas
- Usa tarjetas de prueba de Stripe

### Error de emails:
- Los emails solo se envían si EMAIL_USER y EMAIL_PASS están configurados
- Sin configuración de email, solo se loguean en la consola

## 📊 Logs a Revisar

### En la consola del navegador:
- Errores de JavaScript
- Respuestas de API
- Estados de autenticación

### En la consola del servidor:
- Webhooks de Stripe
- Creación de eventos en Google Calendar
- Envío de emails
- Errores de base de datos

## 🎯 Próximos Pasos

Una vez que todo funcione correctamente:

1. **Configurar emails reales** para producción
2. **Configurar dominio personalizado** en Clerk
3. **Agregar más tipos de visa** si es necesario
4. **Implementar analytics** avanzados
5. **Agregar notificaciones push** para recordatorios

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en la consola
2. Verifica las variables de entorno
3. Asegúrate de que todos los servicios estén configurados
4. Revisa la documentación de Clerk y Google Calendar

¡El sistema está completamente funcional y listo para usar! 🎉
