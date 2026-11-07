'use client';
import { useEffect, useRef, useState } from 'react';
import { Compass, X, Check, ExternalLink } from 'lucide-react';
import { goals, goalProgress, goalTargets } from '@/lib/goals';
import { skillById, type Levels } from '@/lib/progression';
import type { Recommendation } from '@/lib/recommendations';
import { hasRoadmapGuide } from '@/lib/roadmap';

export default function GoalControl({ goalId, levels, onChange, onFit, recommendations, onSelect, focus }: { goalId: string; levels: Levels; onChange: (id: string) => void; onFit: () => void; recommendations: Recommendation[]; onSelect: (id: string) => void; focus: string }) {
  const [open, setOpen] = useState<'goals' | 'next' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const selected = goals.find(g => g.id === goalId);
  const progress = goalProgress(goalId, levels);
  const guidedTargets = selected ? [...goalTargets(selected.id).keys()].filter(id => hasRoadmapGuide(id)).length : 0;
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(null); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); };
  }, [open]);
  return <div ref={ref} className="goal-control">
    <div className="goal-pill"><button aria-label="Choose learning goal" aria-expanded={open === 'goals'} onClick={() => setOpen(open === 'goals' ? null : 'goals')}><Compass size={16}/><span>{selected?.name || 'Choose a goal'}</span>{selected && <small>{progress.completed}/{progress.total}</small>}</button><button aria-label="Suggested next skills" aria-expanded={open === 'next'} onClick={() => setOpen(open === 'next' ? null : 'next')}>Next <small>{recommendations.length}</small></button>{selected && <button aria-label="Fit goal path" title="Fit goal path" onClick={onFit}>↗</button>}</div>
    {open === 'goals' && <section className="goal-menu" aria-label="Learning goals"><div className="goal-heading"><strong>Choose your path</strong><button className="icon-button" aria-label="Close learning goals" onClick={() => setOpen(null)}><X size={16}/></button></div><p>Suggested learning targets, not a certification. Other skills remain visible.</p>{goals.map(goal => <button key={goal.id} className="goal-option" aria-pressed={goal.id === goalId} onClick={() => { onChange(goal.id); setOpen(null); }}><span><strong>{goal.name}</strong><small>{goal.description}</small></span>{goal.id === goalId && <Check size={17}/>}</button>)}{selected && <a className="goal-source" href={`https://roadmap.sh/${selected.roadmap}`} target="_blank" rel="noreferrer noopener"><ExternalLink size={13}/><span>Follow the full track on roadmap.sh<small>{guidedTargets} of {goalTargets(selected.id).size} target skills have a linked guide</small></span></a>}{selected && <button className="clear-goal" onClick={() => { onChange(''); setOpen(null); }}>Clear goal · explore freely</button>}</section>}
    {open === 'next' && <section className="goal-menu next-steps" aria-label="Suggested next skills"><div className="goal-heading"><strong>Your next steps</strong><button className="icon-button" aria-label="Close next steps" onClick={() => setOpen(null)}><X size={16}/></button></div><p>{selected ? `Working toward ${selected.name}.` : `Starting with ${focus}, based on your current levels.`} Suggestions update when you save progress.</p>{recommendations.map(item => <button className="goal-option" key={item.id} onClick={() => { onSelect(item.id); setOpen(null); }}><span><strong>{skillById.get(item.id)!.name}<em> Lv. {levels[item.id] || 0} → {item.target}</em></strong><small>{item.reason}</small></span><span className="next-arrow">↗</span></button>)}{!recommendations.length && <p className="next-empty">{selected ? 'All targets on this path are reached. Choose another goal or explore freely.' : 'Every skill has reached level 10. Revisit your evidence or choose a new challenge.'}</p>}</section>}
  </div>;
}
