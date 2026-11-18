import { notFound } from "next/navigation";
import Studio from "@/components/studio";
import { getCatalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";

export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  if ((await params).section !== "templates") notFound();
  return <Studio initialPage="templates" catalog={await getCatalog()} />;
}
