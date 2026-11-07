import definitions from './skills.json';
import { fromLegacyLevel, ratingLabel } from './proficiency';
export type Skill = typeof definitions[number];
export type Levels = Record<string, number>;
// Source definitions retain their historical 0–10 values; the app uses 0–5 stars.
export const skills: Skill[] = definitions.map(skill => ({ ...skill, initialLevel: fromLegacyLevel(skill.initialLevel), prerequisites: skill.prerequisites.map(p => ({ ...p, level: fromLegacyLevel(p.level) })) }));
export const initialLevels: Levels = Object.fromEntries(skills.map(s => [s.id, s.initialLevel]));
export const STORAGE_KEY = 'skillweave-progress-v2';
// Earlier ten-level saves are read once and migrated into the five-star save.
export const LEGACY_STORAGE_KEY = 'skillweave-progress-v1';
export const PRE_BRAND_STORAGE_KEY = 'arcana-progress-v1';
export const skillById = new Map(skills.map(skill => [skill.id, skill]));
// The Engineering root is a structural anchor that gates the realm. It is always
// satisfied, never rated, and never drawn, so it cannot lock the realm by accident.
export const isStructural = (id: string) => skillById.get(id)?.branch === 'Core';
export const trainableSkills: Skill[] = skills.filter(skill => skill.branch !== 'Core');
// Levels are immutable snapshots. Cache each snapshot without retaining old saves.
const unlockCache = new WeakMap<Levels, ReadonlyMap<string, boolean>>();
export function getUnlockState(levels: Levels): ReadonlyMap<string, boolean> {
  const cached = unlockCache.get(levels);
  if (cached) return cached;
  const result = new Map<string, boolean>();
  const visiting = new Set<string>();
  function visit(id: string): boolean {
    if (result.has(id)) return result.get(id)!;
    const skill = skillById.get(id);
    if (!skill || visiting.has(id)) return false;
    visiting.add(id);
    const unlocked = skill.prerequisites.every(p => (levels[p.id] || 0) >= p.level && visit(p.id));
    visiting.delete(id);
    result.set(id, unlocked);
    return unlocked;
  }
  skills.forEach(skill => visit(skill.id));
  unlockCache.set(levels, result);
  return result;
}
export function isUnlocked(id: string, levels: Levels): boolean {
  return getUnlockState(levels).get(id) ?? false;
}
export function normalizeLevels(value: unknown): Levels {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(skills.map(s => [s.id, s.branch === 'Core' ? s.initialLevel : typeof source[s.id] === 'number' && Number.isFinite(source[s.id]) ? Math.max(0, Math.min(5, Math.round(source[s.id] as number))) : 0]));
}
export function updateLevel(levels: Levels, id: string, level: number): Levels {
  if (!Number.isFinite(level) || isStructural(id) || !isUnlocked(id, levels)) return levels;
  return { ...levels, [id]: Math.min(5, Math.max(0, Math.round(level))) };
}
// Raise every unmet ancestor of `id` to its minimum required level so an
// experienced user can rate an advanced skill directly. Returns the changes made.
export function raisePrerequisites(levels: Levels, id: string): { levels: Levels; changes: { id: string; from: number; to: number }[] } {
  const required = new Map<string, number>();
  const order: string[] = []; // foundations first
  const visit = (skillId: string) => skillById.get(skillId)?.prerequisites.forEach(p => {
    if (isStructural(p.id)) return;
    if ((required.get(p.id) ?? -1) < p.level) { const first = !required.has(p.id); required.set(p.id, p.level); visit(p.id); if (first) order.push(p.id); }
  });
  visit(id);
  const next = { ...levels };
  const changes: { id: string; from: number; to: number }[] = [];
  for (const skillId of order) { const level = required.get(skillId)!; if ((next[skillId] || 0) < level) { changes.push({ id: skillId, from: next[skillId] || 0, to: level }); next[skillId] = level; } }
  return { levels: changes.length ? next : levels, changes };
}
export const rank = ratingLabel;
