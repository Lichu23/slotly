import { NextResponse } from "next/server";

// Simulamos una base de datos simple en memoria
// En producción, usarías una base de datos real
let adminConfig = {
  aiContext: `Eres un asistente especializado en asesoría de visas para España. Tu objetivo es ayudar a los usuarios a determinar qué tipo de visa necesitan.

TIPOS DE VISA DISPONIBLES:
1. ESTUDIO - Para estudiantes que quieren estudiar en España
2. NÓMADA DIGITAL - Para trabajadores remotos y freelancers
3. TRABAJO - Para empleados de empresas españolas

INSTRUCCIONES:
- Haz máximo 5 preguntas específicas para determinar el tipo de visa
- Pregunta sobre: situación laboral, estudios, nacionalidad, tiempo de estancia, ingresos
- Después de 5 preguntas, determina automáticamente el tipo de visa
- Sé profesional, claro y directo
- Solo habla de visas para España`,
  maxQuestions: 5,
};

export async function GET() {
  try {
    return NextResponse.json(adminConfig);
  } catch (error) {
    return NextResponse.json({ error: "Error al cargar configuración" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { aiContext, maxQuestions } = body;

    if (!aiContext || typeof aiContext !== "string") {
      return NextResponse.json({ error: "aiContext es requerido" }, { status: 400 });
    }

    if (!maxQuestions || typeof maxQuestions !== "number" || maxQuestions < 1 || maxQuestions > 10) {
      return NextResponse.json({ error: "maxQuestions debe ser un número entre 1 y 10" }, { status: 400 });
    }

    adminConfig = {
      aiContext: aiContext.trim(),
      maxQuestions: Math.max(1, Math.min(10, maxQuestions)),
    };

    return NextResponse.json({ message: "Configuración guardada exitosamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
