import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/auth/",
        "/dashboard",
        "/editor",
        "/login",
      ],
    },
    sitemap: origin ? origin + "/sitemap.xml" : undefined,
  };
}
