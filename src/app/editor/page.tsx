import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Editor } from "@/components/editor";
import { draftSchema, emptyDraft } from "@/lib/invitation";
import { configured, db, media, paymentsConfigured, user } from "@/lib/server";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; template?: string }>;
}) {
  const { id, template } = await searchParams;
  const customer = await user();
  const selection = draftSchema.shape.template.safeParse(template);
  const initial = {
    ...emptyDraft,
    template: selection.success ? selection.data : emptyDraft.template,
  };
  if (!customer) {
    if (id) notFound();
    return (
      <Editor
        key={initial.template}
        id=""
        initial={initial}
        revision={0}
        paymentMode={false}
        demo
        accountAvailable={configured()}
      />
    );
  }
  if (!id) {
    const newId = randomUUID();
    return (
      <Editor
        key={newId}
        id={newId}
        initial={initial}
        revision={0}
        paymentMode={paymentsConfigured()}
      />
    );
  }
  if (!z.uuid().safeParse(id).success) notFound();
  const database = db();
  const [invitation, publication] = await Promise.all([
    database
      .from("invitations")
      .select("draft,revision")
      .eq("id", id)
      .eq("owner", customer.id)
      .maybeSingle(),
    database
      .from("publications")
      .select("slug,invitations!inner(owner)")
      .eq("invitation", id)
      .eq("invitations.owner", customer.id)
      .maybeSingle(),
  ]);
  if (invitation.error || publication.error)
    throw new Error("Could not load invitation.");
  if (!invitation.data) notFound();
  const draft = draftSchema.parse(invitation.data.draft);
  return (
    <Editor
      key={id}
      id={id}
      initial={draft}
      revision={invitation.data.revision}
      paymentMode={paymentsConfigured()}
      published={publication.data?.slug}
      initialAssets={await media(draft)}
    />
  );
}
