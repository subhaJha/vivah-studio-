import { createHmac, randomUUID } from "node:crypto";
import { z } from "zod";
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
  const body = await req.json().catch(() => null);
  const response = rsvpSchema.safeParse(body);
  const submission = z.uuid().safeParse(body?.submissionId ?? randomUUID());
  if (!slug.success || !response.success || !submission.success)
    return failed("Invalid RSVP.");
  const ip =
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
  const bucket = createHmac("sha256", secret)
    .update(slug.data + "|" + ip)
    .digest("hex");
  const { data, error } = await db().rpc("submit_studio_rsvp_once", {
    p_slug: slug.data,
    p_bucket: bucket,
    p_response: response.data,
    p_submission: submission.data,
  });
  if (error) return failed("Unable to accept RSVP.", 503);
  if (data === "limited")
    return Response.json(
      { message: "Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  if (data !== "accepted") return failed("RSVP is closed.", 404);
  return Response.json({ ok: true });
}
