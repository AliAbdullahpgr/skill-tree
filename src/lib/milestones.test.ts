import test from 'node:test';
import assert from 'node:assert/strict';
import { skills } from './progression';
import { levelStandards, practiceTask } from './milestones';
import tasks from './milestone-tasks.json';

test('every skill has a distinct practical assessment task', () => {
  assert.deepEqual(Object.keys(tasks).sort(), skills.map(s => s.id).sort());
  assert.equal(new Set(Object.values(tasks)).size, skills.length);
  for (const skill of skills) assert.ok(practiceTask(skill).length > 50);
  assert.match(practiceTask(skills.find(s => s.id === 'react')!), /hooks.*error states.*tests/);
});
test('the full rubric covers unrated through teaching others', () => {
  assert.equal(levelStandards.length, 6);
  assert.match(levelStandards[3].criterion, /independently.*edge cases/);
  assert.match(levelStandards[5].criterion, /Review.*teach/);
});
