import test from 'node:test';
import assert from 'node:assert/strict';
import { goals, goalTargets, goalProgress, normalizeGoal, suggestGoal } from './goals';
import { skillById, normalizeLevels, isStructural } from './progression';

test('goal routes contain valid targets and all ancestor requirements', () => {
  for (const goal of goals) {
    const route = goalTargets(goal.id);
    assert.ok(route.size > 10);
    for (const [id, level] of route) {
      assert.ok(skillById.has(id)); assert.ok(level >= 1 && level <= 5);
      assert.ok(!isStructural(id));
      for (const requirement of skillById.get(id)!.prerequisites) if (!isStructural(requirement.id)) assert.ok(route.get(requirement.id)! >= requirement.level);
    }
    const levels = normalizeLevels(Object.fromEntries(route));
    assert.equal(goalProgress(goal.id, levels).completed, route.size);
    assert.equal(goalProgress(goal.id, normalizeLevels({})).completed, 0);
  }
});
test('invalid goals fall back to free exploration', () => {
  for (const input of [null, {}, 'unknown', 5]) assert.equal(normalizeGoal(input), '');
  assert.equal(normalizeGoal('frontend'), 'frontend');
  assert.equal(goalTargets('unknown').size, 0);
});
test('the suggested goal favors existing progress and falls back to frontend', () => {
  assert.equal(suggestGoal(normalizeLevels({})), 'frontend');
  assert.equal(suggestGoal(normalizeLevels({ engineering: 1, logic: 1, communication: 1 })), 'frontend');
  assert.equal(suggestGoal(normalizeLevels({ engineering: 1, python: 2 })), 'ai');
  const frontend = goals.find(goal => goal.id === 'frontend')!;
  assert.equal(suggestGoal(normalizeLevels(frontend.targets)), 'frontend');
});
