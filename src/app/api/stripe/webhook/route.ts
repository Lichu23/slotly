import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs"; // ensure Node runtime for webhooks

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }
  const buf = Buffer.from(await request.arrayBuffer());
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (supabase && session.metadata?.email) {
        await supabase
          .from("consultations")
          .update({ payment_status: "paid" })
          .eq("email", session.metadata.email)
          .eq("visa_type", session.metadata.visa_type || "");
      }
    }
  } catch (e) {
    return NextResponse.json({ received: true, error: true });
  }
  return NextResponse.json({ received: true });
}


