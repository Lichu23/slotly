# Sistema de Administración - Onboarding Completo

## 🎯 Resumen

Se ha creado un sistema completo de administración para la plataforma de asesoría de visas, incluyendo autenticación, dashboard, gestión de reservas, disponibilidad y analytics.

## 🔐 Autenticación

### Credenciales por Defecto
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Variables de Entorno
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### Características de Seguridad
- Autenticación basada en cookies HTTP-only
- Middleware de protección de rutas
- Sesiones persistentes con Zustand
- Redirección automática a login si no está autenticado

## 📊 Dashboard Principal

### URL: `/admin/dashboard`

**Características:**
- Estadísticas en tiempo real
- Métricas clave: total reservas, pendientes, confirmadas, ingresos
- Lista de reservas recientes
- Navegación integrada a todas las secciones

**Métricas Mostradas:**
- Total de reservas
- Reservas pendientes
- Reservas confirmadas
- Ingresos totales
- Slots disponibles vs ocupados

## 📅 Gestión de Reservas

### URL: `/admin/bookings`

**Funcionalidades:**
- Ver todas las reservas con filtros
- Buscar por nombre o email
- Filtrar por estado (todos, pendientes, confirmadas, canceladas)
- Cambiar estado de reservas:
  - Pendiente → Confirmada
  - Pendiente → Cancelada
  - Confirmada → Cancelada
  - Cancelada → Pendiente (reactivar)

**Información Mostrada:**
- Datos del cliente (nombre, email, teléfono)
- Tipo de visa solicitada
- Estado actual
- Fecha de creación
- Acciones disponibles

## ⏰ Gestión de Disponibilidad

### URL: `/admin/availability`

**Funcionalidades:**
- Ver slots por fecha
- Agregar nuevos slots de tiempo
- Liberar/ocupar slots existentes
- Eliminar slots (solo si no tienen reservas)
- Filtro por fecha

**Características:**
- Selector de fecha
- Formulario para agregar nuevos horarios
- Toggle para cambiar disponibilidad
- Validación antes de eliminar slots con reservas

## 📈 Analytics y Reportes

### URL: `/admin/analytics`

**Métricas Disponibles:**
- Total de reservas
- Tiempo promedio de consulta
- Tasa de conversión
- Ingresos totales
- Reservas por mes
- Reservas por tipo de visa
- Ingresos por mes

**Filtros de Tiempo:**
- Últimos 7 días
- Últimos 30 días
- Últimos 90 días
- Último año

## ⚙️ Configuración de IA

### URL: `/admin`

**Funcionalidades:**
- Editar contexto de la IA
- Configurar máximo de preguntas
- Vista previa del contexto
- Guardar/cargar configuración

## 🔧 API Endpoints

### Autenticación
- `POST /api/admin/auth` - Login
- `GET /api/admin/auth` - Verificar sesión
- `DELETE /api/admin/auth` - Logout

### Dashboard
- `GET /api/admin/dashboard` - Estadísticas del dashboard

### Reservas
- `GET /api/admin/bookings` - Listar todas las reservas
- `PATCH /api/admin/bookings/[id]` - Actualizar estado de reserva

### Disponibilidad
- `GET /api/admin/availability?date=YYYY-MM-DD` - Slots por fecha
- `POST /api/admin/availability` - Crear nuevo slot
- `PATCH /api/admin/availability/[id]` - Actualizar disponibilidad
- `DELETE /api/admin/availability/[id]` - Eliminar slot

### Analytics
- `GET /api/admin/analytics?days=N` - Datos de analytics

### Configuración
- `GET /api/admin/config` - Obtener configuración
- `POST /api/admin/config` - Guardar configuración

## 🎨 Navegación

Todas las páginas incluyen navegación consistente:
- Dashboard
- Reservas
- Disponibilidad
- Analytics
- Configuración IA
- Cerrar Sesión

## 🛡️ Protección de Rutas

- Middleware automático en `/middleware.ts`
- Verificación de autenticación en cada página
- Redirección automática a login si no está autenticado
- Estado de autenticación persistente

## 📱 Responsive Design

- Diseño adaptativo para móviles y desktop
- Tablas con scroll horizontal en pantallas pequeñas
- Formularios optimizados para diferentes tamaños
- Navegación colapsable en móviles

## 🚀 Instalación y Uso

1. **Configurar variables de entorno:**
```env
ADMIN_USERNAME=tu_usuario
ADMIN_PASSWORD=tu_contraseña_segura
```

2. **Acceder al sistema:**
- Ir a `/admin/login`
- Usar las credenciales configuradas
- Ser redirigido automáticamente al dashboard

3. **Navegación:**
- Usar los botones de navegación en el header
- Cada sección es independiente y funcional
- Estado persistente entre navegaciones

## 🔄 Flujo de Trabajo Típico

1. **Login** → Dashboard para ver resumen
2. **Reservas** → Gestionar nuevas reservas y cambios de estado
3. **Disponibilidad** → Configurar horarios disponibles
4. **Analytics** → Revisar métricas y rendimiento
5. **Configuración** → Ajustar comportamiento de la IA

## 📋 Próximas Mejoras Sugeridas

- [ ] Autenticación con JWT más robusta
- [ ] Roles y permisos de usuario
- [ ] Notificaciones en tiempo real
- [ ] Exportación de reportes a PDF/Excel
- [ ] Integración con sistemas de pago
- [ ] Logs de auditoría
- [ ] Backup automático de configuraciones
