import test from 'node:test';
import assert from 'node:assert/strict';
import { dependencyPath } from './dependencies';
import { initialLevels, normalizeLevels, skillById } from './progression';

test('a locked skill exposes transitive ancestors and exact deficits', () => {
  const path = dependencyPath('nextjs', initialLevels);
  for (const id of ['nextjs', 'react', 'typescript', 'javascript', 'engineering']) assert.ok(path.ids.has(id));
  const react = path.gaps.find(item => item.id === 'react')!;
  assert.equal(react.required, 5); assert.equal(react.missing, 2);
  assert.ok(path.edges.has('react-nextjs'));
  assert.equal(new Set(path.requirements.map(item => item.id)).size, path.requirements.length);
  for (const item of path.requirements) for (const p of skillById.get(item.id)!.prerequisites) assert.ok(path.requirements.findIndex(r => r.id === p.id) < path.requirements.indexOf(item));
});
test('shared ancestors use their strongest requirement and preserve blocked saved levels', () => {
  const path = dependencyPath('nextjs', normalizeLevels({ react: 9, typescript: 9 }));
  assert.ok(path.gaps.some(item => item.id === 'react' && item.missing === 0 && item.blocked));
  for (const item of path.requirements) {
    const required = Math.max(...[...path.ids].flatMap(id => skillById.get(id)!.prerequisites.filter(p => p.id === item.id).map(p => p.level)));
    assert.equal(item.required, required);
  }
});
test('meeting every ancestor clears gaps; roots have an empty chain', () => {
  const path = dependencyPath('nextjs', initialLevels);
  const completed = normalizeLevels({ ...initialLevels, ...Object.fromEntries(path.requirements.map(item => [item.id, item.required])) });
  assert.equal(dependencyPath('nextjs', completed).gaps.length, 0);
  assert.equal(dependencyPath('engineering', initialLevels).requirements.length, 0);
});
test('the realm root is drawn on the path but never listed as a requirement', () => {
  const path = dependencyPath('kubernetes', initialLevels);
  assert.ok(path.ids.has('engineering'));
  assert.ok(!path.requirements.some(item => item.id === 'engineering'));
  // When the root itself is the blocker, it must be listed.
  assert.ok(dependencyPath('kubernetes', { ...initialLevels, engineering: 0 }).gaps.some(item => item.id === 'engineering'));
});
