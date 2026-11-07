'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Compass, ExternalLink, Maximize, X } from 'lucide-react';
import { goals, goalProgress, goalTargets, suggestGoal } from '@/lib/goals';
import { skillById, type Levels } from '@/lib/progression';
import type { Recommendation } from '@/lib/recommendations';
import { hasRoadmapGuide } from '@/lib/roadmap';

type Props = {
  goalId: string; levels: Levels; onChange: (id: string) => void; onFit: () => void;
  recommendations: Recommendation[]; onSelect: (id: string, guide?: boolean) => void; focus: string;
};

export default function GoalControl({ goalId, levels, onChange, onFit, recommendations, onSelect, focus }: Props) {
  const [open, setOpen] = useState<'goals' | 'next' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const selected = goals.find(g => g.id === goalId);
  const progress = goalProgress(goalId, levels);
  const suggested = suggestGoal(levels);
  const hasPractice = Object.entries(levels).some(([id, level]) => level > 0 && skillById.get(id)?.branch !== 'Core' && id !== 'logic' && id !== 'communication');
  const guidedTargets = selected ? [...goalTargets(selected.id).keys()].filter(id => hasRoadmapGuide(id)).length : 0;
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(null); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); };
  }, [open]);
  const choose = (id: string) => { onChange(id); setOpen(null); };
  return <div ref={ref} className="goal-control">
    <div className="goal-pill">
      <button aria-label="Choose learning goal" aria-expanded={open === 'goals'} onClick={() => setOpen(open === 'goals' ? null : 'goals')}><Compass size={16}/><span>{selected?.name || 'Choose a goal'}</span>{selected && <small title="Goal targets reached, including prerequisites">{progress.completed}/{progress.total} targets</small>}</button>
      <button aria-label="Suggested next skills" aria-expanded={open === 'next'} onClick={() => setOpen(open === 'next' ? null : 'next')}>Next <small>{recommendations.length} skills</small></button>
      {selected && <button aria-label="Fit goal path" title="Focus goal skills" onClick={onFit}><Maximize size={15}/></button>}
    </div>
    {open === 'goals' && <section className="goal-menu" aria-label="Learning goals">
      <div className="goal-heading"><strong>Choose a goal</strong><button className="icon-button" aria-label="Close learning goals" onClick={() => setOpen(null)}><X size={16}/></button></div>
      <p>Suggested targets, not a certification. You can change your goal anytime. Scroll for all six roles.</p>
      <button className="goal-option unsure" aria-pressed={!selected} onClick={() => choose('')}><span aria-hidden="true" className={`goal-radio ${!selected ? 'checked' : ''}`}/><span><strong>Not sure? Explore freely</strong><small>Suggest a mix, starting with the branch on screen.</small></span></button>
      {goals.map(goal => <button key={goal.id} className="goal-option" aria-pressed={goal.id === goalId} onClick={() => choose(goal.id)}>
        <span aria-hidden="true" className={`goal-radio ${goal.id === goalId ? 'checked' : ''}`}/><span><strong>{goal.name}{goal.id === suggested && <em className="goal-suggested">Suggested</em>}</strong><small>{goal.description}</small>{goal.id === suggested && <small className="suggestion-reason">{hasPractice ? 'Closest to your current skill ratings.' : 'A starting point for building your first web app.'}</small>}</span>
      </button>)}
      {selected && <a className="goal-source" href={`https://roadmap.sh/${selected.roadmap}`} target="_blank" rel="noreferrer noopener"><ExternalLink size={13}/><span>Full track on roadmap.sh<small>{guidedTargets} of {goalTargets(selected.id).size} targets have a linked guide</small></span></a>}
      {selected && <button className="clear-goal" onClick={() => choose('')}>Clear goal · explore freely</button>}
    </section>}
    {open === 'next' && <section className="goal-menu next-steps" aria-label="Suggested next skills">
      <div className="goal-heading"><strong>Your next steps</strong><button className="icon-button" aria-label="Close next steps" onClick={() => setOpen(null)}><X size={16}/></button></div>
      <p>{selected ? `Working toward ${selected.name}.` : `Starting with ${focus}, based on your current levels.`} Suggestions update when you save a level.</p>
      <ol className="next-list">{recommendations.map((item, index) => <li key={item.id}>
        <span className="next-index" aria-hidden="true">{index + 1}</span><div><strong>{skillById.get(item.id)!.name}</strong><span className="next-level">Current level {levels[item.id] || 0}/10 · target {item.target}/10</span><p>{item.reason}</p>
          <div className="next-actions"><button onClick={() => { onSelect(item.id); setOpen(null); }}>Rate skill <ChevronRight size={13}/></button>{hasRoadmapGuide(item.id) && <button onClick={() => { onSelect(item.id, true); setOpen(null); }}><BookOpen size={13}/>Open guide</button>}</div>
        </div>
      </li>)}</ol>
      {!recommendations.length && <p className="next-empty">{selected ? 'All targets on this goal are reached. Choose another goal or explore freely.' : 'Every skill has reached level 10. Revisit your evidence or choose a new challenge.'}</p>}
    </section>}
  </div>;
}
