import {chromium,expect} from '@playwright/test';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
const page=browser.contexts()[0].pages()[0];
page.setDefaultTimeout(100000);
page.on('response',async r=>{if(/\/api\/rewards\//.test(r.url())) console.log('Reward API',new URL(r.url()).pathname,r.status(),JSON.stringify(await r.json()).slice(0,180));});
try{
await page.getByRole('link',{name:'Roast',exact:true}).click();
await expect(page.locator('.insta-assistant-bubble').first()).toBeVisible();
await expect(page.locator('.typing-state')).toHaveCount(0,{timeout:100000});
const remaining=Number(await page.locator('.credit-badge b').innerText());
for(let i=0;i<remaining;i++){
let n=await page.locator('.insta-assistant-bubble').count();
await page.locator('#roast-prompt').fill('Test the chat: roast my coffee habit '+i);
await page.getByRole('button',{name:'Send message',exact:true}).click();
await expect(page.locator('#roast-prompt')).toHaveValue('');
await expect(page.locator('.insta-assistant-bubble')).toHaveCount(n+1,{timeout:100000});
console.log('Credits left:',await page.locator('.credit-badge b').innerText());
}
await expect(page.getByRole('dialog')).toHaveCount(0);
await expect(page.locator('.chat-credit-offer')).toBeVisible();
await page.screenshot({path:'work/phone-check/zero-credits.png'});
await page.locator('.chat-credit-offer').getByRole('button',{name:/Go Premium/}).click();
await expect(page.getByRole('dialog')).toBeVisible();
await page.screenshot({path:'work/phone-check/premium.png'});
await page.getByRole('button',{name:'Close dialog',exact:true}).click();
await page.getByRole('button',{name:/Watch an ad/}).click();
console.log('Ad requested on phone.');
await expect(page.locator('.credit-badge b')).toHaveText('5',{timeout:180000});
console.log('PASS: rewarded video restored 5 credits.');
await expect(page.locator('.chat-credit-offer')).toHaveCount(0);
await page.screenshot({path:'work/phone-check/reward-granted.png'});
}finally{await browser.close();}
