import { chromium,expect as playwrightExpect } from '@playwright/test';
const expect=playwrightExpect.configure({timeout:30000});
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {readFile} from 'node:fs/promises';
const serial=process.env.ANDROID_TEST_SERIAL||'emulator-5556';
if(!serial.startsWith('emulator-'))throw Error('This script runs only on an emulator.');
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:args[0]==='install'?120000:30000}).trim();
await mkdir('work',{recursive:true});
let booted=false;for(let i=0;i<45;i++){try{if(adb('shell','getprop','sys.boot_completed')==='1'){booted=true;break;}}catch{}await new Promise(r=>setTimeout(r,2000));}
if(!booted)throw Error('Emulator did not finish booting.');
if(process.env.ANDROID_SKIP_INSTALL!=='true')console.log(adb('install','-r','android/app/build/outputs/apk/debug/app-debug.apk'));
adb('shell','am','force-stop','ai.roastme.app');
adb('shell','am','start','-n','ai.roastme.app/.MainActivity');
let pid='';for(let i=0;i<30;i++){try{pid=adb('shell','pidof','ai.roastme.app');}catch{}if(pid)break;await new Promise(r=>setTimeout(r,1000));}
if(!pid)throw Error('Android app process did not start. Inspect AndroidRuntime logs.');
adb('forward','tcp:9223',`localabstract:webview_devtools_remote_${pid}`);
let browser,lastError;for(let i=0;i<15;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{timeout:5000,noDefaults:true});break;}catch(error){lastError=error;await new Promise(r=>setTimeout(r,1000));}}
if(!browser)throw lastError||Error('Native WebView debugging socket is unavailable.');
try{
const page=browser.contexts()[0].pages()[0];page.setDefaultTimeout(30000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.goto('https://localhost/',{waitUntil:'domcontentloaded'});
if(page.url().includes('onboarding')){await page.getByRole('link',{name:'Skip'}).click();await page.getByRole('button',{name:'Continue as guest'}).click();await page.getByRole('link',{name:'I get it. Bring the heat.'}).click();}
await expect(page.locator('.persona-card')).toHaveCount(6);
await expect(page.locator('.credit-badge b')).not.toHaveText('—');
await expect(page.locator('.persona-card').last()).toHaveCSS('opacity','1');
await page.screenshot({path:'work/android-home.png'});
const credits=Number(await page.locator('.credit-badge b').innerText());
await page.locator('a[href="/chat/savage"]').click();
await page.locator('#roast-prompt').fill('Roast my coffee habit.');await page.getByRole('button',{name:'Send message'}).click();
await expect(page.locator('.assistant-message p')).toBeVisible();await expect(page.locator('.credit-badge b')).toHaveText(String(credits-1));
await page.getByRole('button',{name:'Save roast',exact:true}).click();await expect(page.getByRole('button',{name:'Unsave roast',exact:true})).toBeVisible();
await page.getByRole('button',{name:'Copy roast',exact:true}).click();await expect(page.locator('.toast')).toContainText('copied');
await page.screenshot({path:'work/android-chat.png'});
const encrypted=await page.evaluate(async()=>{const p=window.Capacitor.Plugins.SecureSession;await p.set({key:'qa-session',value:'keystore-roundtrip'});const v=await p.get({key:'qa-session'});await p.remove({key:'qa-session'});return v.value;});expect(encrypted).toBe('keystore-roundtrip');
await page.getByRole('link',{name:'Share roast',exact:true}).click();await expect(page.locator('.share-card')).toBeVisible();
if(process.env.ANDROID_TEST_SHARE==='true'){
await page.getByRole('button',{name:'Share roast card',exact:true}).click();
// Native Android chooser is outside the DOM. Confirm the activity, then dismiss.
await expect.poll(()=>/ChooserActivity|ResolverActivity/.test(adb('shell','dumpsys','activity','activities')),{timeout:60000}).toBe(true);
adb('shell','input','keyevent','4');
await expect(page.locator('.share-card')).toBeVisible();
}
await page.getByRole('link',{name:'Back to the roast room'}).click();
await page.locator('.mobile-nav a[href="/rewards"]').click();
if(await page.getByRole('button',{name:'Claim my 5 credits'}).count()){await page.getByRole('button',{name:'Claim my 5 credits'}).click();await page.getByRole('button',{name:'Close dialog'}).click();}
await page.locator('.mobile-nav a[href="/image"]').evaluate(element=>element.click());
await expect(page.locator('input[type=file]')).toBeAttached();
const photoCredits=Number(await page.locator('.credit-badge b').innerText());
await page.locator('input[type=file]').setInputFiles({name:'qa-photo.webp',mimeType:'image/webp',buffer:await readFile('public/personas.webp')});
await expect(page.locator('.upload-zone img')).toHaveAttribute('src',/^data:image\/jpeg;base64,/);
await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Roast me',exact:true}).click();
await expect(page.locator('.result-card')).toBeVisible();await expect(page.locator('.credit-badge b')).toHaveText(String(photoCredits-2));
await page.screenshot({path:'work/android-photo.png'});
await page.locator('.mobile-nav a[href="/" ]').evaluate(element=>element.click());
expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
expect(errors).toEqual([]);
console.log('Android checks passed: bundled UI, chat/photo credits, on-device image processing, saved roasts, clipboard, Keystore, share-card preview, rewards, and layout.');
if(process.env.ANDROID_TEST_SHARE!=='true')console.log('System share-sheet automation is opt-in (ANDROID_TEST_SHARE=true); this emulator has intermittently stalled Android system UI.');
}finally{await browser.close();adb('forward','--remove','tcp:9223');}
