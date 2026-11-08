import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  PLAY_LICENSE_KEY,
  PLAY_PACKAGE,
  verifyPlaySignature,
  playAccountId,
  readPlaySubscription,
} from "../src/lib/server/google-play";

test("Play RSA verification rejects forged, pending and wrong-package receipts; live status binds account/base plan", () => {
  assert.equal(
    createPublicKey({
      key: Buffer.from(PLAY_LICENSE_KEY, "base64"),
      format: "der",
      type: "spki",
    }).asymmetricKeyDetails?.modulusLength,
    2048,
  );
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const key = publicKey
    .export({ format: "der", type: "spki" })
    .toString("base64");
  const wrap = (data: unknown) => {
    const signedData = JSON.stringify(data);
    return {
      signedData,
      signature: sign("RSA-SHA1", Buffer.from(signedData), privateKey).toString(
        "base64",
      ),
    };
  };
  const purchase = {
    packageName: PLAY_PACKAGE,
    productId: "monthly",
    purchaseToken: "valid-test-token",
    purchaseState: 0,
  };
  assert.equal(verifyPlaySignature(wrap(purchase), key).productId, "monthly");
  const tampered = wrap(purchase);
  tampered.signedData += " ";
  assert.throws(() => verifyPlaySignature(tampered, key), /signature/);
  assert.throws(
    () => verifyPlaySignature(wrap({ ...purchase, purchaseState: 4 }), key),
    /completed/,
  );
  assert.throws(
    () =>
      verifyPlaySignature(wrap({ ...purchase, packageName: "other.app" }), key),
    /completed/,
  );
  const user = "00000000-0000-4000-8000-000000000001";
  const data = {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    externalAccountIdentifiers: {
      obfuscatedExternalAccountId: playAccountId(user),
    },
    lineItems: [
      {
        productId: "weekly",
        offerDetails: { basePlanId: "goweekly" },
        expiryTime: new Date(Date.now() + 86400000).toISOString(),
      },
    ],
  };
  assert.equal(readPlaySubscription(data, user).active, true);
  assert.equal(readPlaySubscription(data, user).plan, "weekly");
  assert.throws(() => readPlaySubscription(data, "another-user"), /different/);
  for (const state of [
    "SUBSCRIPTION_STATE_PENDING",
    "SUBSCRIPTION_STATE_ON_HOLD",
    "SUBSCRIPTION_STATE_PAUSED",
    "SUBSCRIPTION_STATE_EXPIRED",
  ])
    assert.equal(
      readPlaySubscription({ ...data, subscriptionState: state }, user).active,
      false,
    );
  assert.equal(
    readPlaySubscription(
      { ...data, subscriptionState: "SUBSCRIPTION_STATE_CANCELED" },
      user,
    ).active,
    true,
  );
  assert.equal(
    readPlaySubscription(data, user, Date.now() + 2 * 86400000).active,
    false,
  );
  assert.throws(
    () =>
      readPlaySubscription(
        {
          ...data,
          lineItems: [
            {
              ...data.lineItems[0],
              offerDetails: { basePlanId: "wrong-period" },
            },
          ],
        },
        user,
      ),
    /base plan/,
  );
});

test("Play tokens are service-only, cannot move accounts, and revoking one plan preserves another", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table public.profiles(id uuid primary key,premium_status boolean default false,premium_plan text,premium_expires_at timestamptz,subscription_checked_at timestamptz);
    create table public.subscriptions(user_id uuid,provider text,provider_reference text unique,plan_type text,status text,expires_at timestamptz);
    grant all on public.profiles,public.subscriptions to service_role;`);
    await db.exec(
      await readFile(
        new URL("../supabase/google-play-billing.sql", import.meta.url),
        "utf8",
      ),
    );
    const user = "00000000-0000-4000-8000-000000000001",
      other = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into profiles(id) values($1),($2)", [user, other]);
    const apply = (
      owner: string,
      hash: string,
      active: boolean,
      checked: string,
    ) =>
      db.query(
        "select apply_google_play_subscription($1,$2,'test-token','monthly','monthly','monthly',$3,now()+interval '7 days','test',$4)",
        [owner, hash, active, checked],
      );
    const hash = "a".repeat(64),
      second = "b".repeat(64),
      now = new Date().toISOString();
    await apply(user, hash, true, now);
    await apply(user, second, true, now);
    await assert.rejects(apply(other, hash, true, now), /another account/);
    await apply(user, hash, false, new Date(Date.now() + 1000).toISOString());
    assert.equal(
      (
        await db.query<any>("select premium_status from profiles where id=$1", [
          user,
        ])
      ).rows[0].premium_status,
      true,
    );
    await apply(user, second, false, new Date(Date.now() + 2000).toISOString());
    assert.equal(
      (
        await db.query<any>("select premium_status from profiles where id=$1", [
          user,
        ])
      ).rows[0].premium_status,
      false,
    );
    await apply(user, second, true, now);
    assert.equal(
      (
        await db.query<any>("select premium_status from profiles where id=$1", [
          user,
        ])
      ).rows[0].premium_status,
      false,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from google_play_purchases"),
      /permission denied/,
    );
    await assert.rejects(apply(user, hash, true, now), /permission denied/);
    await db.exec("reset role");
    await db.query("delete from profiles where id=$1", [user]);
    assert.equal(
      (await db.query("select * from google_play_purchases")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
