import definitions from './skills.json';
export type Skill = typeof definitions[number];
export type Levels = Record<string, number>;
export const skills: Skill[] = definitions;
export const initialLevels: Levels = Object.fromEntries(skills.map(s => [s.id, s.initialLevel]));
export const STORAGE_KEY = 'skillweave-progress-v1';
// Saves written before the SkillWeave rename. Read once, then rewritten under STORAGE_KEY.
export const LEGACY_STORAGE_KEY = 'arcana-progress-v1';
export const skillById = new Map(skills.map(skill => [skill.id, skill]));
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
  return Object.fromEntries(skills.map(s => [s.id, typeof source[s.id] === 'number' && Number.isFinite(source[s.id]) ? Math.max(0, Math.min(10, Math.round(source[s.id] as number))) : 0]));
}
export function updateLevel(levels: Levels, id: string, level: number): Levels {
  if (!Number.isFinite(level) || !isUnlocked(id, levels)) return levels;
  return { ...levels, [id]: Math.min(10, Math.max(0, Math.round(level))) };
}
export const rank = (level: number) => level === 10 ? 'Transcendent' : level >= 8 ? 'Master' : level >= 5 ? 'Adept' : level >= 3 ? 'Apprentice' : level > 0 ? 'Initiate' : 'Untrained';
