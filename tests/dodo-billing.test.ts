import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("hosted checkout and webhook reconciliation use trusted account/product data and current provider state", () => {
  const script = `
    import { registerHooks } from 'node:module';
    import { createHmac } from 'node:crypto';
    import assert from 'node:assert/strict';
    registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c)}});
    Object.assign(process.env,{DODO_PAYMENTS_API_KEY:'synthetic-key',DODO_PAYMENTS_WEBHOOK_KEY:'whsec_'+Buffer.from('synthetic-webhook-secret').toString('base64'),DODO_PAYMENTS_WEEKLY_PRODUCT_ID:'pdt_weekly',DODO_PAYMENTS_MONTHLY_PRODUCT_ID:'pdt_monthly',DODO_PAYMENTS_ENVIRONMENT:'live_mode'});
    const { webCheckout, syncDodoSubscription, handleDodoEvent } = await import('./src/lib/server/web-billing.ts');
    const calls=[], applied=[], processed=new Set();
    const product={product_id:'pdt_monthly',is_recurring:true,price:{type:'recurring_price',currency:'USD',price:1599,payment_frequency_interval:'Month',payment_frequency_count:1}};
    const sub={subscription_id:'sub_example',product_id:'pdt_monthly',customer:{customer_id:'cus_owned'},metadata:{app:'roastme',supabase_user_id:'owner'},status:'cancelled',previous_billing_date:new Date().toISOString(),next_billing_date:new Date(Date.now()+86400000).toISOString(),payment_frequency_interval:'Month',payment_frequency_count:1,on_demand:false};
    globalThis.fetch=async (url,init)=>{
      const path=new URL(url).pathname; calls.push({path,init});
      if(path.includes('/products/')) return Response.json(product);
      if(path.includes('/subscriptions/')) return Response.json(sub);
      if(path.endsWith('/checkouts')) {
        const body=JSON.parse(init.body);
        assert.deepEqual(body.product_cart,[{product_id:'pdt_monthly',quantity:1}]);
        assert.deepEqual(body.customer,{customer_id:'cus_owned'});
        assert.deepEqual(body.metadata,{supabase_user_id:'owner',app:'roastme'});
        assert.equal(new URL(body.return_url).pathname,'/premium');
        assert.equal(new Headers(init.headers).get('authorization'),'Bearer synthetic-key');
        return Response.json({session_id:'cks_example',checkout_url:'https://checkout.dodopayments.com/session/example'});
      }
      throw Error('Unexpected Dodo API path: '+path);
    };
    const db={from(table){let filters={}; return {select(){return this},eq(k,v){filters[k]=v;return this},async maybeSingle(){return {error:null,data:table==='dodo_customers'?{customer_id:'cus_owned',user_id:'owner'}:processed.has(filters.event_id)?{event_id:filters.event_id}:null}},async upsert(row){processed.add(row.event_id);return {error:null}}}},async rpc(name,args){applied.push(args);return {error:null}}};
    assert.equal((await webCheckout(db,{id:'owner',email:'synthetic@example.com'},'monthly')).url,'https://checkout.dodopayments.com/session/example');
    await assert.rejects(syncDodoSubscription(db,'sub_example','someone-else'),/different account/);
    assert.equal(applied.length,0);
    const id='evt_example', timestamp=String(Math.floor(Date.now()/1000));
    const raw=JSON.stringify({type:'subscription.active',data:{...sub,status:'active'}});
    const signature=createHmac('sha256','synthetic-webhook-secret').update(id+'.'+timestamp+'.'+raw).digest('base64');
    const headers={'webhook-id':id,'webhook-timestamp':timestamp,'webhook-signature':'v1,'+signature};
    await handleDodoEvent(db,raw,headers);
    assert.equal(applied.length,1);
    assert.equal(applied[0].p_active,false,'old activation event must fetch current cancelled state');
    const count=calls.length;
    await handleDodoEvent(db,raw,headers);
    assert.equal(applied.length,1); assert.equal(calls.length,count,'duplicate event is already processed');
    console.log('Dodo request flow passed');
  `;
  assert.match(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", script],
      { encoding: "utf8", timeout: 20000 },
    ),
    /Dodo request flow passed/,
  );
});

test("Dodo requires keys, validates plans/account, and verifies signed webhook bodies", () => {
  const script = `
    import { registerHooks } from 'node:module';
    import { createHmac } from 'node:crypto';
    import assert from 'node:assert/strict';
    registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c)}});
    const d = await import('./src/lib/server/dodo.ts');
    delete process.env.DODO_PAYMENTS_API_KEY;
    assert.equal(d.dodoConfigured(),false);
    assert.throws(()=>d.dodoClient(),/not configured/);
    Object.assign(process.env,{DODO_PAYMENTS_API_KEY:'synthetic-key',DODO_PAYMENTS_WEBHOOK_KEY:'whsec_'+Buffer.from('synthetic-webhook-secret').toString('base64'),DODO_PAYMENTS_WEEKLY_PRODUCT_ID:'pdt_weekly',DODO_PAYMENTS_MONTHLY_PRODUCT_ID:'pdt_monthly',DODO_PAYMENTS_ENVIRONMENT:'live_mode'});
    assert.equal(d.dodoConfigured(),true);
    const product={product_id:'pdt_monthly',is_recurring:true,price:{type:'recurring_price',currency:'USD',price:1599,payment_frequency_interval:'Month',payment_frequency_count:1}};
    assert.equal(d.validateDodoProduct(product,'monthly').priceString,'$15.99');
    assert.throws(()=>d.validateDodoProduct(product,'weekly'),/period or price/);
    assert.throws(()=>d.validateDodoProduct({...product,price:{...product.price,payment_frequency_interval:'Week'}},'monthly'),/period or price/);
    const sub={subscription_id:'sub_example',product_id:'pdt_monthly',customer:{customer_id:'cus_example'},metadata:{app:'roastme',supabase_user_id:'owner'},status:'active',next_billing_date:new Date(Date.now()+86400000).toISOString(),payment_frequency_interval:'Month',payment_frequency_count:1,on_demand:false};
    assert.equal(d.readDodoSubscription(sub,'cus_example','owner').active,true);
    assert.throws(()=>d.readDodoSubscription(sub,'cus_other','owner'),/different account/);
    assert.throws(()=>d.readDodoSubscription(sub,'cus_example','someone-else'),/different account/);
    for(const status of ['pending','on_hold','paused','cancelled','failed','expired','past_due']) assert.equal(d.readDodoSubscription({...sub,status},'cus_example','owner').active,false);
    assert.equal(d.readDodoSubscription({...sub,cancel_at_next_billing_date:true},'cus_example','owner').active,true);
    assert.equal(d.readDodoSubscription(sub,'cus_example','owner',Date.now()+172800000).active,false);
    const client=d.dodoClient(), raw=JSON.stringify({type:'subscription.active',data:sub}), id='evt_example', timestamp=String(Math.floor(Date.now()/1000));
    const signature=createHmac('sha256','synthetic-webhook-secret').update(id+'.'+timestamp+'.'+raw).digest('base64');
    const headers={'webhook-id':id,'webhook-timestamp':timestamp,'webhook-signature':'v1,'+signature};
    assert.equal(client.webhooks.unwrap(raw,{headers}).type,'subscription.active');
    assert.throws(()=>client.webhooks.unwrap(raw+' ',{headers}));
    assert.throws(()=>client.webhooks.unwrap(raw,{headers:{...headers,'webhook-timestamp':'1'}}));
    console.log('Dodo verification passed');
  `;
  assert.match(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", script],
      { encoding: "utf8", timeout: 20000 },
    ),
    /Dodo verification passed/,
  );
});

test("web and Play share Premium; stale/duplicate/revoked events stay safe and billing records remain private", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create table profiles(id uuid primary key,premium_status boolean default false,premium_plan text,premium_expires_at timestamptz,subscription_checked_at timestamptz);
      create table subscriptions(user_id uuid,provider text,provider_reference text unique,plan_type text,status text,expires_at timestamptz);
      grant all on profiles,subscriptions to service_role;`);
    await db.exec(
      await readFile(
        new URL("../supabase/google-play-billing.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL("../supabase/dodo-billing.sql", import.meta.url),
        "utf8",
      ),
    );
    const user = "00000000-0000-4000-8000-000000000001",
      other = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into profiles(id) values($1),($2)", [user, other]);
    await db.query(
      "insert into dodo_customers values($1,'live_mode','cus_owner'),($2,'live_mode','cus_other')",
      [user, other],
    );
    const start = new Date().toISOString(),
      expiry = new Date(Date.now() + 7 * 86400000).toISOString();
    let tick = 0;
    const apply = (
      active: boolean,
      block: string | null = null,
      period = start,
      time?: string,
    ) =>
      db.query(
        "select apply_dodo_subscription($1,'live_mode','sub_owned','cus_owner','pdt_monthly','monthly',$2,$3,$4,'active',$5,'evt_example',$6)",
        [
          user,
          active,
          expiry,
          period,
          time || new Date(Date.now() + ++tick * 1000).toISOString(),
          block,
        ],
      );
    const premium = async () =>
      (
        await db.query<{ premium_status: boolean }>(
          "select premium_status from profiles where id=$1",
          [user],
        )
      ).rows[0].premium_status;
    await apply(true);
    await apply(true);
    assert.equal(
      (await db.query("select * from subscriptions")).rows.length,
      1,
      "redelivery does not duplicate entitlement",
    );
    assert.equal(await premium(), true, "web grants account-wide Premium");
    const play = (active: boolean) =>
      db.query(
        "select apply_google_play_subscription($1,$2,'token','weekly','goweekly','weekly',$3,$4,'checked',$5)",
        [
          user,
          "c".repeat(64),
          active,
          expiry,
          new Date(Date.now() + ++tick * 1000).toISOString(),
        ],
      );
    await play(false);
    assert.equal(
      await premium(),
      true,
      "expired Play purchase cannot erase Dodo",
    );
    await play(true);
    await apply(false);
    assert.equal(await premium(), true, "cancelled Dodo cannot erase Play");
    await play(false);
    assert.equal(await premium(), false);
    await apply(true);
    await apply(false);
    await apply(true, null, start, start);
    assert.equal(
      await premium(),
      false,
      "older read cannot reactivate cancelled subscription",
    );
    await apply(true, expiry);
    await apply(true);
    assert.equal(
      await premium(),
      false,
      "refunded period stays blocked on later active refresh",
    );
    await apply(true, null, expiry);
    assert.equal(await premium(), true, "new paid renewal can restore access");
    await assert.rejects(
      db.query(
        "select apply_dodo_subscription($1,'live_mode','sub_owned','cus_other','pdt_monthly','monthly',true,$2,$3,'active',now(),null,null)",
        [other, expiry, start],
      ),
      /different account/,
    );
    await db.exec("set role authenticated");
    for (const table of ["dodo_customers", "dodo_subscriptions", "dodo_events"])
      await assert.rejects(
        db.query(`select * from ${table}`),
        /permission denied/,
      );
    await assert.rejects(apply(true), /permission denied/);
    await db.exec("reset role");
    await db.query("delete from profiles where id=$1", [user]);
    assert.equal(
      (await db.query("select * from dodo_subscriptions")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
