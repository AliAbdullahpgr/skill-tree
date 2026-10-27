import test from 'node:test';
import assert from 'node:assert/strict';
import { skills, initialLevels, normalizeLevels, isUnlocked } from './progression';
import { goals, goalTargets } from './goals';
import { recommendSkills } from './recommendations';

test('recommendations are reachable, actionable, deterministic, and goal-specific', () => {
  for (const id of ['', ...goals.map(goal => goal.id)]) {
    const suggestions = recommendSkills(initialLevels, id);
    assert.ok(suggestions.length > 0 && suggestions.length <= 3);
    assert.deepEqual(suggestions, recommendSkills(initialLevels, id));
    for (const item of suggestions) {
      assert.ok(isUnlocked(item.id, initialLevels));
      assert.ok(item.target > initialLevels[item.id]);
      if (id) assert.ok(goalTargets(id).has(item.id));
      for (const unlocked of item.unlocks) {
        assert.equal(isUnlocked(unlocked, initialLevels), false);
        assert.ok(isUnlocked(unlocked, { ...initialLevels, [item.id]: item.target }));
      }
    }
  }
});
test('fresh journeys begin with reachable roots; completed goals have no suggestions', () => {
  assert.ok(recommendSkills(normalizeLevels({})).every(item => isUnlocked(item.id, normalizeLevels({}))));
  for (const goal of goals) assert.deepEqual(recommendSkills(normalizeLevels(Object.fromEntries(goalTargets(goal.id))), goal.id), []);
  assert.deepEqual(recommendSkills(Object.fromEntries(skills.map(skill => [skill.id, 10]))), []);
});
test('saving a suggestion removes its completed step from the result', () => {
  const first = recommendSkills(initialLevels, 'frontend')[0];
  const changed = { ...initialLevels, [first.id]: first.target };
  assert.ok(!recommendSkills(changed, 'frontend').some(item => item.id === first.id && item.target === first.target));
});
test('without a goal, suggestions from the branch on screen come first', () => {
  for (const branch of ['Frontend', 'Backend', 'DevOps']) {
    const inBranch = recommendSkills(initialLevels, '', 3, { region: 'Engineering', branch }).map(item => skills.find(skill => skill.id === item.id)!.branch === branch);
    assert.equal(inBranch[0], true);
    assert.deepEqual(inBranch, [...inBranch].sort((a, b) => Number(b) - Number(a)));
  }
  assert.deepEqual(recommendSkills(initialLevels, 'frontend', 3, { region: 'Engineering', branch: 'DevOps' }), recommendSkills(initialLevels, 'frontend'));
});
