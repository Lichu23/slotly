import { NextResponse } from "next/server";

type ChatBody = {
  history: { role: "user" | "assistant"; content: string }[];
};

const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
    const prompt = `Eres un asistente ESTRICTO para un SaaS de asesoría de visas para España. SOLO puedes:
1) Formular una PREGUNTA de aclaración en español, y responder EXCLUSIVAMENTE en JSON: {\"pregunta\": \"texto\"}
2) O bien CLASIFICAR en una de estas: estudio | nomada | trabajo, respondiendo EXCLUSIVAMENTE en JSON: {\"visa\": \"estudio|nomada|trabajo\", \"razon\": \"breve\"}
3) Si el mensaje del usuario es completamente fuera de tema, responde EXCLUSIVAMENTE en JSON: {\"pregunta\": \"Solo puedo ayudarte con tipos de visa para España. ¿Tu objetivo es estudiar, trabajar remotamente o empleo?\"}
NO respondas texto fuera de JSON. NO inventes servicios ni temas ajenos al SaaS.
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
  } catch (e) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}


