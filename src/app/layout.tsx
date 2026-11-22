import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-600-italic.css";
import "./globals.css";
import { siteOrigin } from "@/lib/site";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const origin = siteOrigin();
export const metadata: Metadata = {
  metadataBase: origin ? new URL(origin) : undefined,
  title: "Vivah Studio · Digital Wedding Invitations",
  description: "Create and share an unforgettable digital wedding invitation.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
