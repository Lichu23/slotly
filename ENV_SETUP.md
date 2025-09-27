# Configuración de Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Email Configuration
EMAIL_USER=lisandroxarenax@gmail.com
EMAIL_PASS=tu_app_password_aqui

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_tu_stripe_secret_key_aqui
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Ollama Configuration
OLLAMA_MODEL=qwen2.5:0.5b
```

## Configuración de Gmail

Para que funcione el envío de emails, necesitas:

1. **Activar la verificación en 2 pasos** en tu cuenta de Gmail
2. **Generar una contraseña de aplicación**:
   - Ve a tu cuenta de Google
   - Seguridad → Verificación en 2 pasos
   - Contraseñas de aplicaciones
   - Genera una nueva contraseña para "Mail"
3. **Usar esa contraseña** en `EMAIL_PASS`

## Configuración de Stripe

1. **Crea una cuenta en Stripe**
2. **Obtén tu clave secreta** del dashboard
3. **Configura los webhooks** para `/api/stripe/webhook`
