import { skillById, isUnlocked, isStructural, type Levels } from './progression';
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
      // The structural root is always met; it never appears in a path.
      if (isStructural(p.id)) continue;
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

export type LockReason = { blocker: Requirement; start: Requirement };
// The direct prerequisite that keeps `target` locked, and the first step the user can act on.
export function lockReason(target: string, levels: Levels): LockReason | null {
  if (isUnlocked(target, levels)) return null;
  const path = dependencyPath(target, levels);
  const direct = new Set(skillById.get(target)?.prerequisites.map(p => p.id));
  const blocker = path.gaps.find(item => direct.has(item.id)) ?? path.gaps[path.gaps.length - 1];
  const start = path.gaps.find(item => !item.blocked) ?? blocker;
  return blocker ? { blocker, start } : null;
}
