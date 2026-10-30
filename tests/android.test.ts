import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyAdSignature } from "../src/lib/ad-verification";
import { isAllowedOrigin } from "../src/lib/api-origin";
test("AdMob verification rejects tampering, duplicate fields and incorrect signatures", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const data = "ad_unit=123&reward_amount=5&user_id=example&custom_data=intent";
  const signature = sign("sha256", Buffer.from(data), privateKey).toString(
    "base64url",
  );
  const query = `${data}&signature=${signature}&key_id=42`;
  assert.equal(verifyAdSignature(query, pem).get("reward_amount"), "5");
  assert.throws(() =>
    verifyAdSignature(
      query.replace("reward_amount=5", "reward_amount=500"),
      pem,
    ),
  );
  assert.throws(() => verifyAdSignature(query + "&user_id=attacker", pem));
  assert.throws(() => verifyAdSignature("signature=bad&key_id=42", pem));
});
test("CORS accepts the packaged Android origin and rejects arbitrary websites", () => {
  const request = (origin: string) =>
    new Request("https://roast.example/api/state", {
      headers: { origin, host: "roast.example" },
    });
  assert.equal(isAllowedOrigin(request("https://localhost")), true);
  assert.equal(isAllowedOrigin(request("https://roast.example")), true);
  assert.equal(isAllowedOrigin(request("https://evil.example")), false);
  assert.equal(
    isAllowedOrigin(request("https://localhost.evil.example")),
    false,
  );
});
