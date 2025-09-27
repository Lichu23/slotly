import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

export async function POST(request: Request) {
  try {
    console.log("=== STRIPE API CALLED ===");
    const body = await request.json();
    console.log("Request body:", body);
    
    const priceCents: number = Number(body.price_cents) || 0;
    const visaType: string = String(body.visa_type || "");
    console.log("Parsed data:", { priceCents, visaType });
    
    const metadata: Record<string, string> = {
      visa_type: visaType,
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      invitados: body.invitados ? String(body.invitados) : "",
      comment: String(body.comment || ""),
      selected_date: String(body.selected_date || ""),
      selected_time: String(body.selected_time || ""),
    };
    console.log("Metadata:", metadata);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }
    
    console.log("Stripe key exists, creating session...");

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    console.log("Base URL:", base);
    
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

    console.log("Stripe session created:", { id: session.id, url: session.url });
    return NextResponse.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error("Error creating Stripe session:", e);
    return NextResponse.json({ error: "Failed to create session", details: e.message }, { status: 500 });
  }
}


