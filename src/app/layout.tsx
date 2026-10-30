import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-provider";
import { Shell } from "@/components/shell";
import "./globals.css";
import "./modern.css";
import "./light.css";
export const metadata: Metadata = {
  title: "Roast Me AI — Pick a persona. Get roasted.",
  description:
    "Six personalities. Infinite ways to humble your ego. Playful AI roasts, photo roasts, and roast battles.",
  applicationName: "Roast Me AI",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
