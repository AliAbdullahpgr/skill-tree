import test from 'node:test';
import assert from 'node:assert/strict';
import { readProgress } from './progress-save';
import { fromLegacyLevel, ratingLabel } from './proficiency';
import { isUnlocked, skills } from './progression';
import definitions from './skills.json';

test('legacy levels use five whole-star bands, including unrated', () => {
  assert.deepEqual(Array.from({ length: 11 }, (_, value) => fromLegacyLevel(value)), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(fromLegacyLevel(2.1), 1);
  assert.equal(fromLegacyLevel(NaN), 0);
  assert.equal(fromLegacyLevel(-4), 0);
  assert.equal(fromLegacyLevel(50), 5);
  assert.equal(ratingLabel(3), 'Work independently');
});

test('old backups migrate progress and history without losing profile metadata', () => {
  const restored = readProgress({ version: 1, levels: { ...Object.fromEntries(definitions.map(skill => [skill.id, skill.initialLevel])), javascript: 5, typescript: 3, react: 5, nextjs: 4 }, history: [{ name: 'React', from: 4, to: 5, at: '2026-11-01T12:00:00Z', sample: true }], goalId: 'frontend', theme: 'moonstone', sample: true });
  assert.equal(restored.levels.react, 3);
  assert.equal(restored.levels.typescript, 2);
  assert.equal(restored.levels.nextjs, 2);
  assert.equal(isUnlocked('nextjs', restored.levels), true);
  assert.deepEqual(restored.history[0], { name: 'React', from: 2, to: 3, at: '2026-11-01T12:00:00Z', sample: true });
  assert.equal(restored.goalId, 'frontend');
  assert.equal(restored.theme, 'moonstone');
  assert.equal(restored.sample, true);
  assert.deepEqual(readProgress({ ...restored, version: 2, ratingScale: 5 }), restored, 'five-star saves must not be converted a second time');
});

test('migration retains every previously unlocked skill in real legacy profiles', () => {
  const byId = new Map(definitions.map(skill => [skill.id, skill]));
  for (const old of [Object.fromEntries(definitions.map(skill => [skill.id, skill.initialLevel])), Object.fromEntries(definitions.map(skill => [skill.id, 10]))]) {
    const wasUnlocked = (id: string): boolean => byId.get(id)!.prerequisites.every(p => old[p.id] >= p.level && wasUnlocked(p.id));
    const converted = readProgress({ version: 1, levels: old }).levels;
    for (const skill of skills) if (wasUnlocked(skill.id)) assert.equal(isUnlocked(skill.id, converted), true, skill.id);
  }
});

test('current backups retain stars, sanitize invalid entries, and reject unsupported formats', () => {
  const restored = readProgress({ version: 2, ratingScale: 5, levels: { react: 3, html: 99, css: -1, javascript: '4', unknown: 5 }, history: [null, { name: 'Bad date', at: 'no', from: 1, to: 2 }] });
  assert.equal(restored.levels.react, 3);
  assert.equal(restored.levels.html, 5);
  assert.equal(restored.levels.css, 0);
  assert.equal(restored.levels.javascript, 0);
  assert.equal(restored.levels.unknown, undefined);
  assert.deepEqual(restored.history, []);
  for (const data of [null, { version: 3, levels: {} }, { version: 2, levels: {} }, { version: 2, ratingScale: 10, levels: {} }, { version: 1, levels: [] }]) assert.throws(() => readProgress(data));
});

test('history entries with no change are dropped and the sound preference is kept', () => {
  const data = readProgress({ version: 2, ratingScale: 5, levels: {}, sound: true, history: [
    { name: 'CSS', from: 3, to: 3, at: '2026-01-01T00:00:00Z' },
    { name: 'HTML', from: 2, to: 3, at: '2026-01-01T00:00:00Z' },
  ] });
  assert.deepEqual(data.history.map(entry => entry.name), ['HTML']);
  assert.equal(data.sound, true);
});
