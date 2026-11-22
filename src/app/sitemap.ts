import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!origin) return [];
  const catalog = await getCatalog();
  return [
    "/",
    "/templates",
    ...catalog.map((template) => "/preview/" + template.id),
  ].map((path) => ({
    url: new URL(path, origin).href,
  }));
}
