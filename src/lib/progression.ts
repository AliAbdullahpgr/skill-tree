import definitions from './skills.json';
export type Skill = typeof definitions[number];
export type Levels = Record<string, number>;
export const skills: Skill[] = definitions;
export const initialLevels: Levels = Object.fromEntries(skills.map(s => [s.id, s.initialLevel]));
export const STORAGE_KEY = 'arcana-progress-v1';
export function isUnlocked(id: string, levels: Levels, visiting = new Set<string>()): boolean {
  const skill = skills.find(s => s.id === id);
  if (!skill || visiting.has(id)) return false;
  const next = new Set(visiting).add(id);
  return skill.prerequisites.every(p => (levels[p.id] || 0) >= p.level && isUnlocked(p.id, levels, next));
}
export function normalizeLevels(value: unknown): Levels {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(skills.map(s => [s.id, typeof source[s.id] === 'number' && Number.isFinite(source[s.id]) ? Math.max(0, Math.min(10, Math.round(source[s.id] as number))) : 0]));
}
export function updateLevel(levels: Levels, id: string, level: number): Levels {
  if (!Number.isFinite(level) || !isUnlocked(id, levels)) return levels;
  return { ...levels, [id]: Math.min(10, Math.max(0, Math.round(level))) };
}
export const rank = (level: number) => level === 10 ? 'Transcendent' : level >= 8 ? 'Master' : level >= 5 ? 'Adept' : level >= 3 ? 'Apprentice' : level > 0 ? 'Initiate' : 'Undiscovered';
