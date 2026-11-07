import { skills, isUnlocked, type Levels } from './progression';
import { goals, goalTargets } from './goals';
import { hasRoadmapGuide } from './roadmap';
export type Recommendation = { id: string; target: number; reason: string; unlocks: string[] };
const dependents = new Map(skills.map(skill => [skill.id, skills.filter(next => next.prerequisites.some(p => p.id === skill.id))]));

// Without a goal, `focus` (the branch or realm on screen) ranks nearby skills first.
export function recommendSkills(levels: Levels, goalId = '', limit = 3, focus?: { region: string; branch?: string }): Recommendation[] {
  const goal = goals.find(item => item.id === goalId);
  const route = goalTargets(goalId);
  const candidates = skills.flatMap(skill => {
    const current = levels[skill.id] || 0;
    const target = goal ? route.get(skill.id) : skill.id === 'engineering' ? 1 : current < 5 ? 5 : current < 8 ? 8 : 10;
    if (target === undefined || current >= target || !isUnlocked(skill.id, levels)) return [];
    const reachable = (dependents.get(skill.id) || []).filter(next =>
      (!goal || route.has(next.id)) && !isUnlocked(next.id, levels) && next.prerequisites.every(p =>
        p.id === skill.id ? target >= p.level : (levels[p.id] || 0) >= p.level && isUnlocked(p.id, levels)));
    const nextThreshold = reachable.length ? Math.min(...reachable.map(next => next.prerequisites.find(p => p.id === skill.id)!.level)) : target;
    const opens = reachable.filter(next => next.prerequisites.find(p => p.id === skill.id)!.level <= nextThreshold);
    const reason = opens.length
      ? `Reach level ${nextThreshold} to unlock ${opens.slice(0, 2).map(s => s.name).join(' and ')}${opens.length > 2 ? ` and ${opens.length - 2} more` : ''}.`
      : goal ? `Advance your ${goal.name} path toward level ${target}.`
      : current === 0 ? `An open starting point. Work toward independent practice at level ${target}.`
      : `Build on your level ${current} experience toward level ${target}.`;
    const guide = hasRoadmapGuide(skill.id) ? ' A curated guide is available.' : '';
    // Prefer concrete unlocks, then smaller gaps and existing foundations.
    const focused = !goal && focus && (focus.branch ? skill.branch === focus.branch : skill.region === focus.region);
    const score = (focused ? 1000 : 0) + opens.length * 100 + (current > 0 ? 12 : 0) - (nextThreshold - current) * 3 - current;
    return [{ id: skill.id, target: nextThreshold, reason: reason + guide, unlocks: opens.map(s => s.id), score }];
  });
  return candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, Math.max(0, limit)).map(({ score: _score, ...recommendation }) => recommendation);
}
