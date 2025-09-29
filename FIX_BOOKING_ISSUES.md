# Solución de Problemas del Sistema de Booking

## 🔍 Problemas Identificados:

### 1. **Error en Base de Datos**
```
❌ Error creando booking: {
  code: 'PGRST204',
  message: "Could not find the 'payment_id' column of 'bookings'"
}
```

**Solución:**
- Ejecutar el script `fix_bookings_table.sql` en Supabase
- Esto agregará las columnas faltantes: `payment_id` y `updated_at`

### 2. **No hay Credenciales de Google Calendar**
```
⚠️ No hay credenciales de Google Calendar configuradas
```

**Solución:**
- Ir a `/admin` en la aplicación
- Configurar Google Calendar usando el componente `GoogleCalendarSetup`
- Autorizar la aplicación con Google

### 3. **Error de Conexión SMTP**
```
❌ Error enviando email: connect ECONNREFUSED 127.0.0.1:587
```

**Solución:**
- Configurar variables de entorno SMTP (ver `ENV_SETUP_EMAIL.md`)
- Usar contraseña de aplicación de Gmail
- Probar conexión con `node test-smtp.js`

## 🛠️ Pasos para Solucionar:

### Paso 1: Arreglar Base de Datos
```sql
-- Ejecutar en Supabase SQL Editor
ALTER TABLE bookings ADD COLUMN payment_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

### Paso 2: Configurar Variables de Entorno
```env
# Agregar a .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=noreply@consultas-visa.com
ADMIN_EMAIL=admin@consultas-visa.com
```

### Paso 3: Configurar Google Calendar
1. Ir a `/admin`
2. Hacer clic en "Conectar con Google Calendar"
3. Autorizar la aplicación
4. Verificar que aparezca "Conectado"

### Paso 4: Probar Sistema
1. Ejecutar `node test-smtp.js` para probar emails
2. Hacer una reserva de prueba
3. Verificar que se guarde el booking
4. Verificar que se envíen los emails

## ✅ Resultado Esperado:

Después de aplicar estas soluciones:
- ✅ Bookings se guardan correctamente en la base de datos
- ✅ Eventos se crean en Google Calendar del admin
- ✅ Emails se envían a cliente y admin
- ✅ Sistema funciona completamente
