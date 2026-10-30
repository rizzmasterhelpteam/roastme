import { verify } from "node:crypto";
export function verifyAdSignature(rawQuery: string, pem: string) {
  const match = /^(.*)&signature=([^&]+)&key_id=(\d+)$/.exec(rawQuery);
  if (!match) throw new Error("Invalid signature parameters");
  const entries = new URLSearchParams(rawQuery);
  const names = [...entries.keys()];
  if (new Set(names).size !== names.length)
    throw new Error("Duplicate callback parameters");
  if (
    !verify(
      "sha256",
      Buffer.from(match[1], "utf8"),
      pem,
      Buffer.from(decodeURIComponent(match[2]), "base64url"),
    )
  )
    throw new Error("Invalid callback signature");
  return entries;
}
