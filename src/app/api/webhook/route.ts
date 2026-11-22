import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db, failed, paymentsConfigured } from "@/lib/server";

const payload = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z
          .string()
          .regex(/^pay_[a-zA-Z0-9]+$/)
          .max(80),
        order_id: z
          .string()
          .regex(/^order_[a-zA-Z0-9]+$/)
          .max(80),
        amount: z.number().int().positive().max(2147483647),
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
  const body = Buffer.from(await req.arrayBuffer());
  if (body.length > 262144) return failed("Webhook too large.", 413);
  const expected = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    return failed("Invalid signature.", 401);
  let event: unknown;
  try {
    event = JSON.parse(body.toString("utf8"));
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
  const { data, error } = await db().rpc("process_studio_payment", {
    p_event: createHash("sha256").update(body).digest("hex"),
    p_payment: payment.id,
    p_order: payment.order_id,
    p_status: payment.status,
    p_amount: payment.amount,
  });
  if (error || data === "unknown_order")
    return failed("Could not record payment. Retry later.", 503);
  if (data === "mismatch")
    return failed("Payment does not match the order.", 400);
  if (data !== "recorded" && data !== "duplicate")
    return failed("Unexpected payment result.", 503);
  return Response.json({ ok: true });
}
