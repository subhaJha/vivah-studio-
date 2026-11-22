import { z } from "zod";
import { draftSchema, publishSchema } from "@/lib/invitation";
import { db, failed, sameOrigin, user } from "@/lib/server";

const payloadSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().min(0),
  draft: draftSchema,
  action: z.enum(["save", "publish"]),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return failed("Invalid origin.", 403);
  const customer = await user();
  if (!customer) return failed("Sign in to continue.", 401);
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failed("Check the invitation fields.");
  const { id, revision, draft, action } = parsed.data;
  const database = db();
  if (action === "publish") {
    const validation = publishSchema.safeParse(draft);
    if (!validation.success) return failed(validation.error.issues[0].message);
    const row = await database
      .from("invitations")
      .select("draft")
      .eq("id", id)
      .eq("owner", customer.id)
      .eq("revision", revision)
      .maybeSingle();
    if (row.error) return failed("Unable to load the saved draft.", 503);
    if (
      !row.data ||
      JSON.stringify(draftSchema.safeParse(row.data.draft).data) !==
        JSON.stringify(draft)
    )
      return failed("Save the latest draft before publishing.", 409);
    const { data, error } = await database.rpc("publish_studio_draft", {
      p_owner: customer.id,
      p_id: id,
      p_revision: revision,
    });
    if (error) return failed("Publishing failed. Try again.", 503);
    if (data === "payment")
      return failed(
        "Complete checkout for this template before publishing.",
        402,
      );
    if (data === "slug")
      return failed("This invitation link is already taken.", 409);
    if (data !== "published")
      return failed("The draft changed. Reload before publishing.", 409);
    return Response.json({ revision, slug: draft.slug });
  }
  const paths = [draft.photo, draft.music].filter(Boolean);
  if (paths.length) {
    if (
      draft.photo.endsWith(".mp3") ||
      (draft.music && !draft.music.endsWith(".mp3"))
    )
      return failed("Invalid media type.");
    const { data, error } = await database
      .from("invitation_assets")
      .select("path")
      .eq("owner", customer.id)
      .in("path", paths);
    if (error || data?.length !== paths.length)
      return failed("Select media uploaded to your account.");
  }
  const { data, error } = await database.rpc("save_studio_draft", {
    p_owner: customer.id,
    p_id: id,
    p_revision: revision,
    p_draft: draft,
  });
  if (error) return failed("Could not save your draft.", 503);
  if (!data) {
    const existing = await database
      .from("invitations")
      .select("draft,revision")
      .eq("id", id)
      .eq("owner", customer.id)
      .eq("revision", revision + 1)
      .maybeSingle();
    if (existing.error)
      return failed("Could not verify the saved revision.", 503);
    const stored = draftSchema.safeParse(existing.data?.draft);
    if (
      stored.success &&
      JSON.stringify(stored.data) === JSON.stringify(draft)
    ) {
      return Response.json({ revision: existing.data!.revision });
    }
    return failed(
      "This draft was edited elsewhere. Keep this tab open and reload in another tab to reconcile your changes.",
      409,
    );
  }
  return Response.json({ revision: data });
}
