import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db, failed, paymentsConfigured } from "@/lib/server";

const payload = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number(),
        currency: z.literal("INR"),
        status: z.enum(["captured", "failed"]),
      }),
    }),
  }),
});

export async function POST(req: Request) {
  if (!paymentsConfigured()) return failed("Payments unavailable.", 503);
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(signature))
    return failed("Invalid signature.", 401);
  const body = await req.text();
  const expected = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    return failed("Invalid signature.", 401);
  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    return failed("Invalid event.");
  }
  if (
    event &&
    typeof event === "object" &&
    "event" in event &&
    !["payment.captured", "payment.failed"].includes(String(event.event))
  )
    return Response.json({ ok: true });
  const parsed = payload.safeParse(event);
  if (!parsed.success) return failed("Invalid event.");
  const payment = parsed.data.payload.payment.entity;
  if (parsed.data.event !== "payment." + payment.status)
    return failed("Payment status does not match event.");
  const database = db();
  const order = await database
    .from("orders")
    .select("amount")
    .eq("provider_order", payment.order_id)
    .maybeSingle();
  if (order.error) return failed("Order lookup failed.", 503);
  if (order.data?.amount !== payment.amount)
    return failed("Payment does not match an order.", 404);
  const { error } = await database.rpc("record_studio_payment", {
    p_payment: payment.id,
    p_order: payment.order_id,
    p_status: payment.status,
  });
  if (error) return failed("Could not record payment.", 503);
  return Response.json({ ok: true });
}
