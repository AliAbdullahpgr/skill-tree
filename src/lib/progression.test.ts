import test from 'node:test';
import assert from 'node:assert/strict';
import { skills, getUnlockState, initialLevels, isUnlocked, normalizeLevels, updateLevel } from './progression';
test('all identifiers and prerequisites form a valid acyclic graph', () => {
 const ids = new Set(skills.map(s => s.id)); assert.equal(ids.size, skills.length);
 function visit(id: string, path: Set<string>) { assert.ok(!path.has(id), 'cycle'); const skill = skills.find(s=>s.id===id)!; for(const p of skill.prerequisites){ assert.ok(ids.has(p.id)); assert.ok(p.level>=1 && p.level<=10); visit(p.id,new Set(path).add(id)); } }
 skills.forEach(s=>visit(s.id,new Set()));
});
test('unlocks require all prerequisites, including their own ancestors', () => {
 const levels={...initialLevels,react:5,typescript:3}; assert.equal(isUnlocked('nextjs',levels),true);
 assert.equal(isUnlocked('nextjs',{...levels,typescript:2}),false);
 assert.equal(isUnlocked('nextjs',{...levels,javascript:0}),false);
});
test('lowering prerequisites reseals descendants without losing their levels', () => {
 const start={...initialLevels,react:7,nextjs:4,typescript:3};
 const result=updateLevel(start,'javascript',0); assert.equal(isUnlocked('nextjs',result),false); assert.equal(result.nextjs,4);
 const restored=updateLevel(result,'javascript',5); assert.equal(isUnlocked('nextjs',restored),true); assert.equal(restored.nextjs,4);
});
test('level updates respect lock state, valid numbers and bounds', () => {
 assert.equal(updateLevel(initialLevels,'nextjs',10),initialLevels);
 assert.equal(updateLevel(initialLevels,'html',NaN),initialLevels);
 assert.equal(updateLevel(initialLevels,'html',12).html,10);
 assert.equal(updateLevel(initialLevels,'html',-3).html,0);
 assert.equal(updateLevel(initialLevels,'html',4.6).html,5);
});
test('untrusted imports discard unknown keys and invalid values', () => {
 const result=normalizeLevels({html:100,css:-3,javascript:'8',react:NaN,unknown:10});
 assert.equal(result.html,10);assert.equal(result.css,0);assert.equal(result.javascript,0);assert.equal(result.react,0);assert.equal(result.unknown,undefined);assert.equal(Object.keys(result).length,skills.length);
});

test('expanded engineering graph preserves old save levels and starts new skills untrained', () => {
 const saved=normalizeLevels({engineering:1,html:7,css:6,javascript:5,react:4});
 assert.equal(saved.react,4);assert.equal(saved.kubernetes,0);
 assert.ok(skills.filter(s=>s.region==='Engineering').length>=200);
 assert.equal(new Set(skills.filter(s=>s.region==='Engineering'&&s.branch!=='Core').map(s=>s.branch)).size,10);
 assert.equal(isUnlocked('git',saved),true);assert.equal(isUnlocked('kubernetes',saved),false);
});
test('cached prerequisite evaluation is reused and invalidated by a new level snapshot', () => {
 const a=getUnlockState(initialLevels);assert.equal(a,getUnlockState(initialLevels));
 const next=updateLevel(initialLevels,'engineering',0);const b=getUnlockState(next);
 assert.notEqual(a,b);assert.equal(b.get('git'),false);assert.equal(a.get('git'),true);
});
test('all skills are reachable with fully trained prerequisites', () => {
 const levels=Object.fromEntries(skills.map(s=>[s.id,10]));
 for(const skill of skills)assert.equal(isUnlocked(skill.id,levels),true,skill.id);
});
