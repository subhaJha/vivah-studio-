import type { Metadata } from "next";
import { siteOrigin } from "@/lib/site";
import { notFound } from "next/navigation";
import Studio from "@/components/studio";
import { getCatalog } from "@/lib/catalog";
export const metadata: Metadata = {
  title: "Wedding Invitation Templates · Vivah Studio",
  description:
    "Explore Indian wedding invitation designs, from Royal Bengali to modern floral invitations.",
  alternates: { canonical: siteOrigin() ? "/templates" : undefined },
};
export const dynamic = "force-dynamic";

export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  if ((await params).section !== "templates") notFound();
  return <Studio initialPage="templates" catalog={await getCatalog()} />;
}
