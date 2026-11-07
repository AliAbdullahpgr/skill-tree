import coverage from './roadmap-coverage.json';

const guides = new Set<string>(coverage.skillsWithGuides);

export const roadmapCoverage = coverage;
export function hasRoadmapGuide(skillId: string): boolean {
  return guides.has(skillId);
}
