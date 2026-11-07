'use client';
import { starCount } from '@/lib/proficiency';
import type { Skill } from '@/lib/progression';
import { levelStandards, practiceTask, milestoneEvidence } from '@/lib/milestones';

export default function MilestoneGuide({ skill, level }: { skill: Skill; level: number }) {
  const standard = levelStandards[level];
  return <section className="milestone-guide" aria-label={`${skill.name} proficiency guide`}>
    <span className="milestone-eyebrow">{starCount(level)} · {standard.title}</span>
    <p>{standard.criterion}</p>
    <div className="practice-task"><strong>Practice task · {skill.name}</strong><p>{practiceTask(skill)}</p></div>
    <details><summary>Compare all 5 ratings</summary><ol>{levelStandards.slice(1).map((item, index) => <li key={item.title} aria-current={level === index + 1 ? 'step' : undefined}><strong>{item.title}</strong><p>{item.criterion}</p></li>)}</ol><p className="milestone-evidence">{milestoneEvidence(skill)}</p><p className="quiet-note">Cumulative guidance for self-assessment. A single completed task does not establish mastery.</p></details>
  </section>;
}
