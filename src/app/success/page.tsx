import Link from "next/link";
import Stripe from "stripe";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  
  // Obtener información de la sesión de Stripe para obtener el email del cliente
  let customerEmail = "";
  let gmailLink = "https://mail.google.com/mail/u/0/#inbox"; // Fallback genérico
  
  if (sessionId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-08-27.basil" });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.customer_email) {
        customerEmail = session.customer_email;
        // Crear enlace específico para el email del cliente
        gmailLink = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(customerEmail)}`;
      } else if (session.metadata?.email) {
        customerEmail = session.metadata.email;
        gmailLink = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(customerEmail)}`;
      }
    } catch (error) {
      console.error("Error obteniendo información de la sesión:", error);
    }
  }
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6 text-center">
        <h1 className="text-xl lg:text-2xl font-semibold mb-2">¡Pago exitoso!</h1>
        <p className="text-neutral-600 mb-4 text-sm sm:text-base">
          Gracias por reservar tu consulta. Hemos enviado la invitación con el enlace de Google Meet a tu correo.
          {customerEmail && (
            <span className="block mt-2 text-xs sm:text-sm text-neutral-500">
              Email: {customerEmail}
            </span>
          )}
        </p>
        {sessionId ? (
          <p className="text-xs text-neutral-500 mb-6">ID de sesión: {sessionId}</p>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/chat" className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-center text-sm sm:text-base">
            Volver al chat
          </Link>
          <a 
            href={gmailLink} 
            target="_blank" 
            rel="noreferrer" 
            className="px-4 py-2 rounded-lg border text-center hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
             Abrir Gmail
          </a>
        </div>
      </div>
    </div>
  );
}