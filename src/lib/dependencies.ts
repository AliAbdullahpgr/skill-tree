import { skillById, isUnlocked, type Levels } from './progression';
export type Requirement = { id: string; required: number; current: number; missing: number; blocked: boolean; met: boolean };
export type DependencyPath = { target: string; ids: ReadonlySet<string>; edges: ReadonlySet<string>; requirements: Requirement[]; gaps: Requirement[] };

export function dependencyPath(target: string, levels: Levels): DependencyPath {
  const ids = new Set<string>();
  const edges = new Set<string>();
  const required = new Map<string, number>();
  const ordered: string[] = [];
  function visit(id: string) {
    if (ids.has(id)) return;
    const skill = skillById.get(id);
    if (!skill) return;
    ids.add(id);
    for (const p of skill.prerequisites) {
      required.set(p.id, Math.max(required.get(p.id) || 0, p.level));
      edges.add(`${p.id}-${id}`);
      visit(p.id);
    }
    ordered.push(id);
  }
  visit(target);
  const requirements = ordered.filter(id => id !== target && required.has(id)).map(id => {
    const current = levels[id] || 0, targetLevel = required.get(id)!;
    const blocked = !isUnlocked(id, levels);
    return { id, required: targetLevel, current, missing: Math.max(0, targetLevel - current), blocked, met: !blocked && current >= targetLevel };
  });
  return { target, ids, edges, requirements, gaps: requirements.filter(item => !item.met) };
}
