import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Draft } from "./invitation";

export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
export function paymentsConfigured() {
  return (
    configured() &&
    Boolean(
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET,
    )
  );
}
export function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function auth() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(items) {
          try {
            items.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot set cookies. */
          }
        },
      },
    },
  );
}
export const user = cache(async () => {
  if (!configured()) return null;
  const { data } = await (await auth()).auth.getUser();
  if (
    data.user?.banned_until &&
    Date.parse(data.user.banned_until) > Date.now()
  )
    return null;
  return data.user;
});
export async function media(draft: Draft) {
  const paths = [draft.photo, draft.music].filter(Boolean);
  if (!paths.length) return {};
  const { data, error } = await db()
    .storage.from("invitation-media")
    .createSignedUrls(paths, 3600);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [],
    ),
  );
}
export function failed(message: string, status = 400) {
  return Response.json({ message }, { status });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return (
    origin === new URL(req.url).origin ||
    Boolean(origin && origin === process.env.NEXT_PUBLIC_SITE_URL)
  );
}
