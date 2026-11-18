import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, failed, paymentsConfigured, sameOrigin, user } from "@/lib/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return failed("Invalid origin.", 403);
  if (!paymentsConfigured())
    return failed("Demo mode. Live checkout is disabled.", 503);
  const customer = await user();
  if (!customer) return failed("Sign in to continue.", 401);
  const parsed = z
    .object({ id: z.uuid() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failed("Invalid invitation.");
  const database = db();
  const invitation = await database
    .from("invitations")
    .select("template")
    .eq("id", parsed.data.id)
    .eq("owner", customer.id)
    .maybeSingle();
  if (invitation.error) return failed("Could not load invitation.", 503);
  if (!invitation.data) return failed("Invitation unavailable.", 404);
  const invitationId = parsed.data.id;
  const templateId = invitation.data.template;
  const template = await database
    .from("templates")
    .select("price,active")
    .eq("id", templateId)
    .single();
  if (!template.data?.active) return failed("Template unavailable.", 404);
  const amount = template.data.price;
  const paid = await database
    .from("payments")
    .select("provider_payment,orders!inner(invitation,template)")
    .eq("status", "captured")
    .eq("orders.invitation", invitationId)
    .eq("orders.template", templateId)
    .limit(1)
    .maybeSingle();
  if (paid.error) return failed("Could not check previous payments.", 503);
  if (paid.data)
    return failed(
      "This design is already paid for. You can publish it now.",
      409,
    );

  const existingOrder = () =>
    database
      .from("orders")
      .select("provider_order")
      .eq("invitation", invitationId)
      .eq("template", templateId)
      .eq("amount", amount)
      .maybeSingle();
  const checkout = (order: string) =>
    Response.json({ order, amount, key: process.env.RAZORPAY_KEY_ID });
  const existing = await existingOrder();
  if (existing.error) return failed("Could not check previous orders.", 503);
  if (existing.data) return checkout(existing.data.provider_order);

  try {
    const result = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET,
          ).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: randomUUID(),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) return failed("Checkout could not start.", 502);
    const order = z
      .object({
        id: z.string().startsWith("order_"),
        amount: z.literal(amount),
        currency: z.literal("INR"),
      })
      .parse(await result.json());
    const { error } = await database.from("orders").insert({
      provider_order: order.id,
      invitation: invitationId,
      template: templateId,
      amount,
    });
    if (error?.code === "23505") {
      const winner = await existingOrder();
      if (winner.data) return checkout(winner.data.provider_order);
    }
    if (error) return failed("Could not record checkout.", 503);
    return checkout(order.id);
  } catch {
    return failed("Checkout provider is unavailable.", 502);
  }
}
