import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
const definitions=JSON.parse(readFileSync(new URL('../src/lib/skills.json',import.meta.url)));
mkdirSync('.artifacts', {recursive: true});
const localChrome='/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const browser = await chromium.launch({ headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : existsSync(localChrome) ? {executablePath:localChrome} : {}), args:['--no-sandbox'] });
const base=process.env.TEST_URL || 'http://127.0.0.1:3091';
const page = await browser.newPage({viewport:{width:1536,height:960},deviceScaleFactor:1});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const find=async(name)=>{await page.getByRole('textbox',{name:'Find a skill'}).fill(name);await page.locator('.search-results button').filter({hasText:name}).first().click();await page.locator('.inspector-hero h2').filter({hasText:name}).waitFor();console.log('Selected',name);};
try {
 await page.goto(base);await page.waitForSelector('.react-flow__node');await page.waitForTimeout(1200);
 assert.ok(await page.locator('.react-flow__node').count()>0);
 assert.ok(await page.locator('.react-flow__node').count()<definitions.length/2);
 assert.deepEqual(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)),[]);
 assert.equal(await page.locator('.inspector').count(),0);
 // The structural Engineering root and its connections are never drawn.
 const expectedConnections=definitions.filter(skill=>skill.branch!=='Core').reduce((count,skill)=>count+skill.prerequisites.filter(p=>p.id!=='engineering').length,0);
 assert.equal(await page.locator('.skill-connections path').count(),expectedConnections);
 assert.equal(await page.locator('[data-edge-id^="engineering-"],[data-id="engineering"]').count(),0);
 const connection=await page.locator('[data-edge-id="html-css"]').getAttribute('d');
 const html=definitions.find(skill=>skill.id==='html'),css=definitions.find(skill=>skill.id==='css');
 assert.equal(connection,`M${html.x+35},${html.y+35}L${css.x+35},${css.y+35}`);
 assert.equal(await page.locator('.react-flow__handle').count(),0);
 await page.locator('.react-flow__node').first().focus();await page.keyboard.press('Enter');
 await page.locator('.inspector').waitFor();await page.keyboard.press('Escape');

 const board=await page.locator('.atlas-area').boundingBox(); assert.ok(board.height / 960 >= .9);
 await find('React');
 await page.getByRole('radio',{name:/^3 stars/}).click();
 if(await page.locator('.cinematic').isVisible()) await page.getByRole('button',{name:'Not now'}).click();
 assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('skillweave-progress-v2'))).levels.react,3);
 await page.reload();await page.waitForSelector('.react-flow__node');
 await find('React');assert.equal(await page.getByRole('radio',{name:/^3 stars/}).getAttribute('aria-checked'),'true');
 await find('TypeScript');await page.getByRole('radio',{name:/^2 stars/}).click();
 // Side unlocks are announced in the notification; the full-screen moment is reserved for the skill being pursued.
 await page.getByRole('status').filter({hasText:'Unlocked: Next.js'}).waitFor();assert.equal(await page.locator('.cinematic').count(),0);
 await find('React');await page.getByRole('radio',{name:/^4 stars/}).click();
 await find('Next.js');assert.equal(await page.getByRole('radio',{name:/^1 star /}).isEnabled(),true);
 await page.getByRole('button',{name:'History',exact:true}).click();assert.deepEqual((await page.locator('.chronicle-list h3').allInnerTexts()).slice(0,3),['React','TypeScript','React']);
 await page.getByRole('button',{name:'Skills',exact:true}).click();assert.equal(await page.locator('.codex-grid>button').count(),definitions.filter(skill=>skill.branch!=='Core').length);
 await page.locator('.codex-grid').getByRole('button',{name:/^Logical Thinking /}).click();assert.equal(await page.locator('.inspector-hero h2').innerText(),'Logical Thinking');
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Moonstone',exact:false}).click();assert.equal(await page.locator('.theme-moonstone').count(),1);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'skillweave-progress.json');
 await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"nope":true}')});await page.getByRole('alert').filter({hasText:'not a valid'}).waitFor();
 await page.locator('input[type=file]').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,levels:{engineering:1,html:9},history:[]}))});
 await page.getByRole('status').filter({hasText:'restored'}).waitFor();assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('skillweave-progress-v2'))).levels.html,5);
 await page.getByRole('button',{name:'Midnight',exact:false}).click();await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:'Choose realm or branch'}).click();
 await page.locator('.realm-menu').getByRole('button',{name:'Engineering',exact:true}).click();
 const oldZoom=await page.locator('.canvas-controls>span').innerText();await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForTimeout(400);assert.notEqual(await page.locator('.canvas-controls>span').innerText(),oldZoom);
 // Restore representative demo for the final visual capture.
 await page.evaluate(()=>localStorage.removeItem('skillweave-progress-v2'));await page.reload();await page.waitForTimeout(1200);await page.screenshot({path:'.artifacts/desktop.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base);await mobile.waitForSelector('.react-flow__node');await mobile.waitForTimeout(1000);
 assert.equal(await mobile.locator('.inspector').count(),0);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 const mobileBoard=await mobile.locator('.atlas-area').boundingBox();assert.ok(mobileBoard.height/844>=.85);
 await mobile.getByRole('button',{name:'Choose realm or branch'}).click();await mobile.locator('.realm-menu').getByRole('button',{name:'Personal Skills',exact:true}).click();await mobile.waitForTimeout(1100);assert.match(await mobile.locator('.realm-trigger').innerText(),/Personal Skills/);
 await mobile.getByRole('button',{name:'Open skill search'}).click();await mobile.getByRole('textbox',{name:'Find a skill'}).fill('Writing');await mobile.locator('.search-results button').first().click();assert.equal(await mobile.locator('.inspector-hero h2').innerText(),'Writing');await mobile.getByRole('button',{name:'Close skill details'}).click();
 await mobile.getByRole('button',{name:'Choose realm or branch'}).click();await mobile.locator('.realm-menu').getByRole('button',{name:'Engineering',exact:true}).click();
 await mobile.reload();await mobile.waitForTimeout(800);await mobile.screenshot({path:'.artifacts/mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: expanded graph with viewport culling, images, progression, cinematic unlock, persistence, codex, chronicle, region navigation, theme, export/import, zoom and mobile. No browser errors.');
} finally {await browser.close();}
