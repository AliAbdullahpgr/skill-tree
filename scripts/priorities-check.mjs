import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const local='/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:existsSync(local)?{executablePath:local}:{}),args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:3091');await page.waitForSelector('.react-flow__node');
 await page.getByRole('button',{name:'View entire atlas'}).click();
 await page.waitForFunction(()=>document.querySelector('.atlas-area').dataset.overview==='true');
 assert.equal(await page.locator('.react-flow__node').count(),228);
 assert.equal(await page.locator('.constellation-label').count(),12);
 assert.ok(Number(await page.locator('.connection-detail').first().evaluate(e=>getComputedStyle(e).opacity))<.1);
 await page.getByRole('textbox',{name:'Find a skill'}).fill('React');await page.locator('.search-results button').filter({hasText:'React'}).first().click();
 await page.waitForFunction(()=>document.querySelector('.atlas-area').dataset.detail==='detail');
 assert.equal(await page.locator('[data-id="react"] .node-caption').isVisible(),true);
 assert.ok(await page.locator('.connection-focus').count()>0);
 await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS: semantic zoom, overview summaries, connection decluttering, readable focused skill.');
} finally {await browser.close();}
