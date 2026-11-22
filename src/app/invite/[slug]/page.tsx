import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { InvitationViews } from "@/components/invitation-views";
import { Invitation } from "@/components/invitation";
import { draftSchema, slugSchema } from "@/lib/invitation";
import { configured, db, media } from "@/lib/server";

export const dynamic = "force-dynamic";
const snapshot = cache(async (slug: string) => {
  if (!configured() || !slugSchema.safeParse(slug).success) return null;
  const { data, error } = await db()
    .from("publications")
    .select("snapshot")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  const parsed = draftSchema.safeParse(data?.snapshot);
  return parsed.success ? parsed.data : null;
});
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const draft = await snapshot((await params).slug);
  if (!draft) return { title: "Invitation unavailable" };
  const title = `${draft.bride} & ${draft.groom} · Wedding invitation`;
  return {
    title,
    description: draft.message,
    robots: { index: false, follow: false },
    openGraph: { title, description: draft.message, type: "website" },
  };
}
export default async function PublicInvitation({ params }: Props) {
  const { slug } = await params;
  const draft = await snapshot(slug);
  if (!draft) notFound();
  const assets = await media(draft).catch(() => ({}));
  return (
    <>
      <InvitationViews slug={slug} />
      <Invitation draft={draft} slug={slug} assets={assets} />
    </>
  );
}
