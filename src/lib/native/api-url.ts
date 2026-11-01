const canonicalApiOrigin = "https://www.roastme-ai.com";

export function resolveApiOrigin(configuredUrl: string | undefined) {
  const value = configuredUrl?.trim().replace(/\/+$/, "") || "";
  // These aliases redirect across origins. WebView preflights cannot use
  // those redirects, and redirected requests can lose Authorization.
  if (
    value === "https://roastme-gold.vercel.app" ||
    value === "https://roastme-ai.com"
  ) return canonicalApiOrigin;
  return value;
}
