import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (supabase) {
      await supabase.from("consultations").insert({
        name: body.name,
        email: body.email,
        invitados: body.invitados ?? null,
        comment: body.comment ?? null,
        phone: body.phone,
        visa_type: body.visa_type,
        price: body.price ?? null,
        payment_status: "pending",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}


