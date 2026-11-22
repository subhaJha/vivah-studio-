export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const deployment = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const value =
    configured || (deployment ? "https://" + deployment : undefined);
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.origin : undefined;
  } catch {
    return undefined;
  }
}
