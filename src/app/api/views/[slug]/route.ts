import { slugSchema } from "@/lib/invitation";
import { configured, db, failed, sameOrigin } from "@/lib/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!sameOrigin(req)) return failed("Invalid origin.", 403);
  const parsed = slugSchema.safeParse((await params).slug);
  if (!parsed.success || !configured())
    return new Response(null, { status: 204 });
  const { error } = await db().rpc("record_studio_view", {
    p_slug: parsed.data,
  });
  return new Response(null, { status: error ? 503 : 204 });
}
