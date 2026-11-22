import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteOrigin } from "@/lib/site";
import { templates } from "@/lib/templates";
import { notFound } from "next/navigation";
import { Invitation } from "@/components/invitation";
import { draftSchema, sampleDraft } from "@/lib/invitation";

type Props = { params: Promise<{ template: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { template } = await params;
  const design = templates.find((item) => item.id === template);
  if (!design) return {};
  const title = design.title + " Wedding Invitation · Vivah Studio";
  const path = "/preview/" + design.id;
  const canonical = siteOrigin() ? path : undefined;
  return {
    title,
    description: design.description,
    alternates: { canonical },
    openGraph: { title, description: design.description, url: canonical },
  };
}

export default async function Preview({ params }: Props) {
  const parsed = draftSchema.shape.template.safeParse((await params).template);
  if (!parsed.success) notFound();
  return (
    <main>
      <div className="flex items-center justify-between gap-3 border-b border-[#e7d7ca] bg-cream px-5 py-3">
        <Link
          href="/templates"
          className="text-sm font-semibold text-wine underline"
        >
          All templates
        </Link>
        <Button asChild size="sm">
          <Link href={"/editor?template=" + parsed.data}>
            Customize this template
          </Link>
        </Button>
      </div>
      <Invitation draft={{ ...sampleDraft, template: parsed.data }} />
    </main>
  );
}
