import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
import "./modern.css";
import "./light.css";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "Roast Me AI", type: "website", images: [{ url: "/social-preview.png", width: 1200, height: 630, alt: "Roast Me AI — Pick a persona. Get roasted." }] },
  twitter: { card: "summary_large_image", images: ["/social-preview.png"] },
  title: "Roast Me AI — Pick a persona. Get roasted.",
  description:
    "Six personalities. Infinite ways to humble your ego. Playful AI roasts, photo roasts, and roast battles.",
  applicationName: "Roast Me AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.png?v=complete-20261107", type: "image/png", sizes: "64x64" }],
    shortcut: "/favicon.ico?v=complete-20261107",
    apple: "/apple-touch-icon.png?v=complete-20261106",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090a20",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
