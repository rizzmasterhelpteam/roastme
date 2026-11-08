import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("real generation uses one request for reply, notes and decision, including overlong replies", () => {
  const script = `
    import { registerHooks } from 'node:module';
    import assert from 'node:assert/strict';
    registerHooks({ resolve(specifier, context, next) {
      if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
      return next(specifier, context);
    }});
    const { generate, SafetyError } = await import('./src/lib/server/providers.ts');
    let count=0, blocked=false;
    process.env.OPENROUTER_API_KEY='unit-test-key';
    const longReply='A complete synthetic joke. '.repeat(40).trim();
    globalThis.fetch=async (url, init)=>{
      count++;
      assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');
      const body=JSON.parse(init.body);
      assert.equal(body.reasoning.effort,'none');
      assert.deepEqual(body.response_format.json_schema.schema.required,['allowed','reply','notes']);
      return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({allowed:!blocked,reply:blocked?'':longReply,notes:blocked?'':'Fictional hamster: Pixel.'})}}]});
    };
    for(const type of ['chat','text','battle']) {
      const before=count;
      const result=await generate({prompt:'Roast my fictional hamster Pixel.',persona:'grandma',opponent:'savage',type,chaos:100,language:'English',replyLength:'short',sessionId:'00000000-0000-4000-8000-000000000001'});
      assert.equal(count,before+1);
      assert.equal(result.content,longReply);
      assert.equal(result.notes,'Fictional hamster: Pixel.');
    }
    blocked=true;
    const before=count;
    await assert.rejects(generate({prompt:'Synthetic blocked fixture',persona:'savage',type:'chat',chaos:30,language:'English',replyLength:'medium'}),SafetyError);
    assert.equal(count,before+1);
    console.log('single request verified');
  `;
  const result = execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script],
    { encoding: "utf8", cwd: process.cwd(), timeout: 20000 },
  );
  assert.match(result, /single request verified/);
});
