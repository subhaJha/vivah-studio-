"use client";

import { useEffect, useRef } from "react";

export function InvitationViews({ slug }: { slug: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const key = "vivah-view:" + slug;
    function count() {
      if (document.visibilityState !== "visible" || sent.current === slug)
        return;
      try {
        if (sessionStorage.getItem(key)) return;
      } catch {
        /* The in-memory guard still suppresses repeated views. */
      }
      sent.current = slug;
      void fetch("/api/views/" + slug, { method: "POST", keepalive: true })
        .then((response) => {
          if (response.ok) {
            try {
              sessionStorage.setItem(key, "1");
            } catch {
              /* Storage is optional. */
            }
          } else sent.current = null;
        })
        .catch(() => {
          sent.current = null;
        });
    }
    count();
    document.addEventListener("visibilitychange", count);
    return () => document.removeEventListener("visibilitychange", count);
  }, [slug]);
  return null;
}
