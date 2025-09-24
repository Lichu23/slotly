import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const priceCents: number = Number(body.price_cents) || 0;
    const visaType: string = String(body.visa_type || "");
    const metadata: Record<string, string> = {
      visa_type: visaType,
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      invitados: body.invitados ? String(body.invitados) : "",
      comment: String(body.comment || ""),
    };

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/chat?canceled=1`,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Consulta — ${visaType.toUpperCase()}` },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      metadata,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}


