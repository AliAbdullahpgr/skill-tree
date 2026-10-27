'use client';
import { useEffect, useRef, useState } from 'react';
import { Compass, X, Check } from 'lucide-react';
import { goals, goalProgress } from '@/lib/goals';
import type { Levels } from '@/lib/progression';

export default function GoalControl({ goalId, levels, onChange, onFit }: { goalId: string; levels: Levels; onChange: (id: string) => void; onFit: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = goals.find(g => g.id === goalId);
  const progress = goalProgress(goalId, levels);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); };
  }, [open]);
  return <div ref={ref} className="goal-control">
    <div className="goal-pill"><button aria-label="Choose learning goal" aria-expanded={open} onClick={() => setOpen(!open)}><Compass size={16}/><span>{selected?.name || 'Choose a goal'}</span>{selected && <small>{progress.completed}/{progress.total}</small>}</button>{selected && <button aria-label="Fit goal path" title="Fit goal path" onClick={onFit}>↗</button>}</div>
    {open && <section className="goal-menu" aria-label="Learning goals"><div className="goal-heading"><strong>Choose your path</strong><button className="icon-button" aria-label="Close learning goals" onClick={() => setOpen(false)}><X size={16}/></button></div><p>Suggested learning targets, not a certification. Other skills remain visible.</p>{goals.map(goal => <button key={goal.id} className="goal-option" aria-pressed={goal.id === goalId} onClick={() => { onChange(goal.id); setOpen(false); }}><span><strong>{goal.name}</strong><small>{goal.description}</small></span>{goal.id === goalId && <Check size={17}/>}</button>)}{selected && <button className="clear-goal" onClick={() => { onChange(''); setOpen(false); }}>Clear goal · explore freely</button>}</section>}
  </div>;
}
