import tasks from './milestone-tasks.json';
import type { Skill } from './progression';

export const levelStandards = [
  { title: 'Not rated', criterion: 'No practical experience yet. Start with a small guided exercise.' },
  { title: 'Learning the basics', criterion: 'Explain the purpose and basic vocabulary. Complete a guided exercise and describe the steps.' },
  { title: 'Simple tasks', criterion: 'Complete a small task with some reference material. Adapt an example to a different requirement.' },
  { title: 'Work independently', criterion: 'Complete the practice task independently. Handle realistic edge cases and show evidence that the result works.' },
  { title: 'Complex work', criterion: 'Handle a larger, ambiguous task. Diagnose difficult failures, compare approaches, and explain the tradeoffs.' },
  { title: 'Teach and guide', criterion: 'Deliver complex work consistently. Review others’ work, teach the reasoning, and help others apply the skill successfully.' },
] as const;
export function practiceTask(skill: Skill): string { return tasks[skill.id as keyof typeof tasks]; }
export function milestoneEvidence(skill: Skill): string {
  if (skill.region !== 'Engineering') return 'Keep an example, the outcome, and feedback from someone affected by your work. Revisit the skill in a different situation.';
  return 'Keep a working artifact, meaningful checks or measurements, and a short explanation of decisions and limitations. Reference documentation is allowed at every proficiency.';
}
