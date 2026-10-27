import { skillById, isUnlocked, type Levels } from './progression';

export const goals = [
  { id: 'frontend', name: 'Frontend Engineer', description: 'Build accessible, tested web applications with React.', targets: { html: 6, css: 6, javascript: 6, typescript: 5, react: 5, nextjs: 4, accessibility: 5, responsive: 5, forms: 4, 'web-performance': 4, 'unit-testing': 4, e2e: 3, git: 4 } },
  { id: 'backend', name: 'Backend Engineer', description: 'Design secure APIs, reliable data models, and deployable services.', targets: { nodejs: 5, api: 5, rest: 5, auth: 4, postgres: 5, indexes: 4, transactions: 4, docker: 4, 'integration-testing': 4, monitoring: 3, 'input-validation': 4, git: 4 } },
  { id: 'ai', name: 'AI Engineer', description: 'Build and evaluate data-driven models and retrieval applications.', targets: { python: 5, pandas: 4, ml: 5, 'model-evaluation': 5, embeddings: 4, rag: 4, 'ai-evaluation': 4, 'responsible-ai': 4, fastapi: 3, git: 4 } },
] as const;
export type Goal = typeof goals[number];
export function normalizeGoal(value: unknown): string { return goals.some(g => g.id === value) ? String(value) : ''; }

// Include every ancestor at the highest level required by any route into it.
export function expandTargets(targets: Readonly<Record<string, number>>): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  function add(id: string, level: number) {
    const skill = skillById.get(id);
    if (!skill || (result.get(id) ?? -1) >= level) return;
    result.set(id, level);
    skill.prerequisites.forEach(p => add(p.id, p.level));
  }
  Object.entries(targets).forEach(([id, level]) => add(id, level));
  return result;
}
const routes = new Map(goals.map(goal => [goal.id as string, expandTargets(goal.targets)]));
const empty = new Map<string, number>();
export function goalTargets(id: string) { return routes.get(id) ?? empty; }
export function goalProgress(id: string, levels: Levels) {
  const targets = goalTargets(id);
  const completed = [...targets].filter(([skill, target]) => isUnlocked(skill, levels) && (levels[skill] || 0) >= target).length;
  return { completed, total: targets.size };
}
