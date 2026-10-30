export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const publicOrigin = `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;
  const native = (process.env.NATIVE_APP_ORIGINS || "https://localhost")
    .split(",")
    .map((s) => s.trim());
  return (
    origin === publicOrigin ||
    origin === process.env.NEXT_PUBLIC_APP_URL ||
    native.includes(origin)
  );
}
export function corsHeaders(request: Request) {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(request)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}
