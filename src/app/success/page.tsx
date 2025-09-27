import Link from "next/link";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  const gmailLink = "https://mail.google.com/mail/u/0/#inbox";
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">¡Pago exitoso!</h1>
        <p className="text-neutral-600 mb-4">Gracias por reservar tu consulta. Hemos enviado la invitación con el enlace de Google Meet al correo provisto.</p>
        {sessionId ? (
          <p className="text-xs text-neutral-500 mb-6">ID de sesión: {sessionId}</p>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/chat" className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-center">Volver al chat</Link>
          <a href={gmailLink} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border text-center">Abrir Gmail</a>
        </div>
      </div>
    </div>
  );
}


