// Script para probar la conexión SMTP
// Ejecutar con: node test-smtp.js

const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('🔧 Probando conexión SMTP...');
  
  // Configuración SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    // Verificar conexión
    console.log('📡 Verificando conexión...');
    await transporter.verify();
    console.log('✅ Conexión SMTP exitosa');
    
    // Enviar email de prueba
    console.log('📧 Enviando email de prueba...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: 'Prueba de configuración SMTP',
      html: `
        <h2>✅ Configuración SMTP funcionando</h2>
        <p>Este es un email de prueba para verificar que la configuración SMTP está funcionando correctamente.</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Servidor:</strong> ${process.env.SMTP_HOST}</p>
        <p><strong>Puerto:</strong> ${process.env.SMTP_PORT}</p>
      `,
    });
    
    console.log('✅ Email de prueba enviado:', info.messageId);
    
  } catch (error) {
    console.error('❌ Error en la conexión SMTP:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verificar que las variables de entorno estén configuradas');
    console.log('2. Usar contraseña de aplicación en lugar de contraseña normal');
    console.log('3. Verificar que el puerto y host sean correctos');
    console.log('4. Verificar que la autenticación de 2 factores esté habilitada');
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  testSMTP();
}

module.exports = { testSMTP };
