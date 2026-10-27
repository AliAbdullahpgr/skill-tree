import tasks from './milestone-tasks.json';
import type { Skill } from './progression';

export const levelStandards = [
  { title: 'Untrained', criterion: 'No practical experience yet. Start with a small guided exercise.' },
  { title: 'Recognize', criterion: 'Explain the purpose, basic vocabulary, and one appropriate use case in your own words.' },
  { title: 'Follow', criterion: 'Complete a guided version of the practice task and explain the major steps.' },
  { title: 'Adapt', criterion: 'Change a guided solution to meet a different requirement; explain what changed and why.' },
  { title: 'Work independently', criterion: 'Complete a small version without a step-by-step tutorial. Reference documentation is welcome.' },
  { title: 'Deliver reliably', criterion: 'Complete the practice task independently. Handle realistic edge cases and show evidence that the result works.' },
  { title: 'Diagnose', criterion: 'Find and fix a non-obvious failure. Record the cause, the fix, and a check that prevents recurrence.' },
  { title: 'Choose tradeoffs', criterion: 'Compare at least two approaches against explicit constraints, measure the result, and justify your choice.' },
  { title: 'Lead complex work', criterion: 'Handle a larger, ambiguous application of this skill. Review another person’s work and explain the difficult decisions.' },
  { title: 'Advance practice', criterion: 'Solve unfamiliar, difficult problems repeatedly. Produce a reusable contribution that knowledgeable peers can evaluate.' },
  { title: 'Exceptional mastery', criterion: 'Show sustained, independently reviewed impact across different challenging contexts. Create new methods or insights that others successfully apply.' },
] as const;
export function practiceTask(skill: Skill): string { return tasks[skill.id as keyof typeof tasks]; }
export function milestoneEvidence(skill: Skill): string {
  if (skill.region !== 'Engineering') return 'Keep an example, the outcome, and feedback from someone affected by your work. Revisit the skill in a different situation.';
  return 'Keep a working artifact, meaningful checks or measurements, and a short explanation of decisions and limitations. Reference documentation is allowed at every level.';
}
