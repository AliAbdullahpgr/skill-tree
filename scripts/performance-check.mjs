import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
const local='/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:existsSync(local)?{executablePath:local}:{}),args:['--no-sandbox']});
const runs=[];
for(let i=0;i<3;i++){
 const p=await browser.newPage({viewport:{width:1366,height:768}});const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');
 const t=performance.now();await p.goto(process.env.TEST_URL||'http://127.0.0.1:3091',{waitUntil:'domcontentloaded'});await p.waitForSelector('.react-flow__node');const ready=performance.now()-t;await p.waitForTimeout(1400);
 const before=await cdp.send('Performance.getMetrics');await p.mouse.move(350,500);await p.mouse.down();for(let j=0;j<80;j++)await p.mouse.move(350+j*3,500+Math.sin(j/8)*100);await p.mouse.up();await p.waitForTimeout(200);const after=await cdp.send('Performance.getMetrics');
 const metric=(r,n)=>r.metrics.find(m=>m.name===n)?.value||0;
 runs.push({readyMs:Math.round(ready),mountedNodes:await p.locator('.react-flow__node').count(),panScriptMs:Math.round((metric(after,'ScriptDuration')-metric(before,'ScriptDuration'))*1000),panTaskMs:Math.round((metric(after,'TaskDuration')-metric(before,'TaskDuration'))*1000),heapMB:Math.round(metric(after,'JSHeapUsedSize')/1048576),jsDecodedKB:await p.evaluate(()=>Math.round(performance.getEntriesByType('resource').filter(r=>r.name.includes('/_next/')&&r.name.includes('.js')).reduce((n,r)=>n+r.decodedBodySize,0)/1024))});await p.close();
}
await browser.close();mkdirSync('.artifacts',{recursive:true});const result={runs,median:Object.fromEntries(Object.keys(runs[0]).map(key=>[key,runs.map(r=>r[key]).sort((a,b)=>a-b)[1]]))};writeFileSync(`.artifacts/performance-${process.argv[2]||'current'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
