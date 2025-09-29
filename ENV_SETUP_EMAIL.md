# Configuración de Variables de Entorno para Emails

## Variables requeridas para el envío de emails:

```env
# Configuración SMTP para envío de emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=noreply@consultas-visa.com

# Email del administrador
ADMIN_EMAIL=admin@consultas-visa.com
```

## Configuración para Gmail:

1. **Habilitar autenticación de 2 factores** en tu cuenta de Gmail
2. **Generar una contraseña de aplicación**:
   - Ve a Configuración de Google > Seguridad
   - Busca "Contraseñas de aplicaciones"
   - Genera una nueva contraseña para "Mail"
   - Usa esa contraseña en `SMTP_PASS`

## Configuración para otros proveedores:

### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo:
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Notas importantes:

- **Nunca uses tu contraseña normal** de Gmail
- **Usa contraseñas de aplicación** para mayor seguridad
- **El puerto 587** es para conexiones seguras (TLS)
- **El puerto 465** es para conexiones SSL (requiere `SMTP_SECURE=true`)
