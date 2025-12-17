import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { updatePaymentStatus, getPaymentByOrderId } from "@/lib/services/payments";

type RazorpayEvent = {
  event: string;
  payload: any;
};

function isValidSignature(body: string, webhookSecret?: string, providedSignature?: string): boolean {
  if (!webhookSecret || !providedSignature) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  return expected === providedSignature;
}

export async function handlePaymentsWebhook(req: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || undefined;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!isValidSignature(rawBody, webhookSecret, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let event: RazorpayEvent | null = null;
    try {
      event = JSON.parse(rawBody);
    } catch {
      // Malformed JSON after valid signature should still respond gracefully
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const type = event?.event;
    if (!type) {
      return NextResponse.json({ received: true });
    }

    if (type === "payment.authorized" || type === "payment.captured" || type === "payment.failed") {
      const payment = event!.payload?.payment?.entity;
      const orderId: string | undefined = payment?.order_id;
      const statusRaw: string = payment?.status || "created";
      const status = statusRaw === "failed" ? "failed" : "completed";
      // Minimal logging for observability
      console.log("[Webhook]", { type, orderId, paymentId: payment?.id, status });
      if (orderId) {
        const existing = await getPaymentByOrderId(orderId);
        if (existing) {
          await updatePaymentStatus(existing.id, status, payment?.id || "");
        }
      }
    } else if (type === "order.paid") {
      const order = event!.payload?.order?.entity;
      const orderId: string | undefined = order?.id;
      console.log("[Webhook]", { type, orderId });
      if (orderId) {
        const existing = await getPaymentByOrderId(orderId);
        if (existing) {
          await updatePaymentStatus(existing.id, "completed", order?.id || "");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
