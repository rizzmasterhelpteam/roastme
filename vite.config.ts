import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");
  const publicKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_REVENUECAT_ANDROID_KEY",
    "NEXT_PUBLIC_ADMOB_REWARDED_ID",
  ];
  return {
    root: path.resolve("native"),
    publicDir: path.resolve("public"),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@/lib/web-billing-client": path.resolve("native/web-billing.ts"),
        "@/components/website/blog-navigation": path.resolve("native/blog-navigation.tsx"),
        "@": path.resolve("src"),
        "next/link": path.resolve("native/link.tsx"),
        "next/navigation": path.resolve("native/navigation.ts"),
      },
    },
    define: Object.fromEntries(
      publicKeys.map((key) => [
        `process.env.${key}`,
        JSON.stringify(env[key] || ""),
      ]),
    ),
    build: {
      outDir: path.resolve("dist-native"),
      emptyOutDir: true,
      target: "es2020",
      sourcemap: false,
      chunkSizeWarningLimit: 650,
    },
    server: { host: "0.0.0.0", port: 5173, fs: { allow: [process.cwd()] } },
    preview: { host: "127.0.0.1", port: 4173 },
  };
});
