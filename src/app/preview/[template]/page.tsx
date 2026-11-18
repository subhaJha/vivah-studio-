import { notFound } from "next/navigation";
import { Invitation } from "@/components/invitation";
import { draftSchema, sampleDraft } from "@/lib/invitation";

export default async function Preview({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const parsed = draftSchema.shape.template.safeParse((await params).template);
  if (!parsed.success) notFound();
  return <Invitation draft={{ ...sampleDraft, template: parsed.data }} />;
}
