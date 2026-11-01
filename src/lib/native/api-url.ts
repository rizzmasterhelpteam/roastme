const canonicalApiOrigin = "https://www.roastme-ai.com";

export function resolveApiOrigin() {
  // Android always calls the production domain directly.
  return canonicalApiOrigin;
}
