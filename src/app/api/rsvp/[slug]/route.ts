import { createHmac } from "node:crypto";
import { rsvpSchema, slugSchema } from "@/lib/invitation";
import { configured, db, failed, sameOrigin } from "@/lib/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!sameOrigin(req)) return failed("Invalid origin.", 403);
  const secret = process.env.RSVP_RATE_LIMIT_SECRET;
  if (!configured() || !secret) return failed("RSVP is unavailable.", 503);
  const slug = slugSchema.safeParse((await params).slug);
  const response = rsvpSchema.safeParse(await req.json().catch(() => null));
  if (!slug.success || !response.success) return failed("Invalid RSVP.");
  const ip =
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
  const bucket = createHmac("sha256", secret)
    .update(slug.data + "|" + ip)
    .digest("hex");
  const { data, error } = await db().rpc("submit_studio_rsvp", {
    p_slug: slug.data,
    p_bucket: bucket,
    p_response: response.data,
  });
  if (error) return failed("Unable to accept RSVP.", 503);
  if (data === "limited") return failed("Try again later.", 429);
  if (data !== "accepted") return failed("RSVP is closed.", 404);
  return Response.json({ ok: true });
}
