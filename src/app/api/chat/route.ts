import { NextResponse } from "next/server";

type ChatBody = {
  history: { role: "user" | "assistant"; content: string }[];
  adminContext?: string;
};

const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
    // Usar contexto de admin si está disponible, sino usar el contexto por defecto
    const baseContext = body.adminContext || `Eres un clasificador de visas para España.

INSTRUCCIONES:
- Analiza la respuesta del usuario
- Determina el tipo de visa: estudio, nomada, o trabajo
- Responde SOLO con JSON válido

FORMATO OBLIGATORIO:
{"visa": "estudio|nomada|trabajo", "razon": "explicación breve"}

NO hagas preguntas. NO uses texto fuera de JSON.`;

    const prompt = `${baseContext}

Historial:
${body.history.map((m) => `${m.role}: ${m.content}`).join("\n")}`;

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "ollama_unreachable" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ response: data.response });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}