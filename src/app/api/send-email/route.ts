import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { visaType, name, email, phone, invitados, comment, price, duration } = body;

    // Configurar el email
    const to = "lisandroxarenax@gmail.com";
    const subject = `Nueva Consulta de Visa - ${visaType.toUpperCase()}`;
    
    const emailBody = `
Nueva consulta de visa recibida:

TIPO DE VISA: ${visaType.toUpperCase()}
DURACIÓN: ${duration || 'No especificada'} minutos
PRECIO: €${price}

INFORMACIÓN DEL CLIENTE:
- Nombre: ${name}
- Email: ${email}
- Teléfono: ${phone}
${invitados ? `- Invitados: ${invitados}` : ''}

COMENTARIOS ADICIONALES:
${comment || 'Sin comentarios adicionales'}

---
Enviado desde el sistema de consultas de visas
Fecha: ${new Date().toLocaleString('es-ES')}
    `.trim();

    // Debug: Log del email que se va a enviar
    console.log("=== EMAIL DEBUG INFO ===");
    console.log("Para:", to);
    console.log("Asunto:", subject);
    console.log("Variables de entorno:");
    console.log("- EMAIL_USER:", process.env.EMAIL_USER ? "✅ Configurado" : "❌ No configurado");
    console.log("- EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ Configurado" : "❌ No configurado");
    console.log("- NODE_ENV:", process.env.NODE_ENV);

    // Configurar Nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'lisandroxarenax@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu_app_password_aqui'
      }
    });

    // Enviar email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'lisandroxarenax@gmail.com',
      to: to,
      subject: subject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">
            Nueva Consulta de Visa - ${visaType.toUpperCase()}
          </h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Detalles de la Consulta</h3>
            <p><strong>Tipo de Visa:</strong> ${visaType.toUpperCase()}</p>
            <p><strong>Duración:</strong> ${duration || 'No especificada'} minutos</p>
            <p><strong>Precio:</strong> €${price}</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Información del Cliente</h3>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${phone}</p>
            ${invitados ? `<p><strong>Invitados:</strong> ${invitados}</p>` : ''}
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Comentarios Adicionales</h3>
            <p>${comment || 'Sin comentarios adicionales'}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Enviado desde el sistema de consultas de visas<br>
            Fecha: ${new Date().toLocaleString('es-ES')}
          </p>
        </div>
      `
    };

    // Verificar si tenemos configuración real de email
    const hasRealConfig = process.env.EMAIL_USER && 
                         process.env.EMAIL_PASS && 
                         process.env.EMAIL_PASS !== 'tu_app_password_aqui';

    if (!hasRealConfig) {
      console.log("⚠️ No hay configuración real de email, solo logueando");
      console.log("📧 Email que se habría enviado:");
      console.log("   Para:", to);
      console.log("   Asunto:", subject);
      console.log("   Contenido:", emailBody);
      
      return NextResponse.json({ 
        success: true, 
        message: "Email logueado (sin configuración real de email)" 
      });
    }

    // Intentar enviar el email real
    try {
      console.log("📧 Intentando enviar email real a:", to);
      const result = await transporter.sendMail(mailOptions);
      console.log("✅ Email enviado exitosamente!");
      console.log("📧 Message ID:", result.messageId);
      console.log("📧 Response:", result.response);
      
      return NextResponse.json({ 
        success: true, 
        message: "Email enviado correctamente" 
      });
    } catch (emailError) {
      console.error("❌ Error enviando email:", emailError);
      console.log("📧 Email que falló:");
      console.log("   Para:", to);
      console.log("   Asunto:", subject);
      console.log("   Error:", emailError.message);
      
      return NextResponse.json({ 
        success: false, 
        message: "Error enviando email", 
        error: emailError.message 
      });
    }

  } catch (error) {
    console.error("Error general en send-email:", error);
    return NextResponse.json(
      { error: "Error al enviar email", details: error.message }, 
      { status: 500 }
    );
  }
}