import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db, failed, paymentsConfigured, sameOrigin, user } from "@/lib/server";

const receipt = z.object({
  razorpay_order_id: z
    .string()
    .regex(/^order_[a-zA-Z0-9]+$/)
    .max(80),
  razorpay_payment_id: z
    .string()
    .regex(/^pay_[a-zA-Z0-9]+$/)
    .max(80),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return failed("Invalid origin.", 403);
  if (!paymentsConfigured()) return failed("Payments unavailable.", 503);
  const customer = await user();
  if (!customer) return failed("Sign in to continue.", 401);
  const parsed = receipt.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failed("Invalid payment receipt.");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    parsed.data;
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(razorpay_signature, "hex"))) {
    return failed("Invalid payment signature.", 401);
  }
  const database = db();
  const order = await database
    .from("orders")
    .select(
      "provider_order,invitations!inner(owner),payments(provider_payment,status)",
    )
    .eq("provider_order", razorpay_order_id)
    .eq("invitations.owner", customer.id)
    .maybeSingle();
  if (order.error)
    return failed("Payment status is temporarily unavailable.", 503);
  if (!order.data) return failed("Order unavailable.", 404);
  const status =
    order.data.payments.find(
      (payment) => payment.provider_payment === razorpay_payment_id,
    )?.status ?? "pending";
  return Response.json({ status });
}
