'use client';
import { useId, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { proficiencyLabels, proficiencyDescriptions, starCount } from '@/lib/proficiency';

export function Stars({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`stars ${className}`} role="img" aria-label={`${starCount(value)} out of 5`} title={`${starCount(value)} · ${proficiencyLabels[value]}`}>
    {[1, 2, 3, 4, 5].map(star => <Star key={star} aria-hidden="true" className={star <= value ? 'filled' : ''}/>)}
  </span>;
}

export default function StarRating({ value, onChange, goalTarget }: { value: number; onChange: (value: number) => void; goalTarget?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();
  const descriptionId = useId();
  const preview = hover ?? value;
  return <section className="proficiency-editor" aria-labelledby={labelId}>
    <div className="proficiency-heading"><h3 id={labelId}>Your proficiency</h3><button disabled={value === 0} className="clear-rating" onClick={() => { setHover(null); onChange(0); }} aria-label="Clear proficiency rating">Clear</button></div>
    <div className="star-rating" role="radiogroup" aria-labelledby={labelId} aria-describedby={descriptionId} onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(star => <button key={star} ref={element => { refs.current[star - 1] = element; }} type="button" role="radio" aria-checked={value === star} aria-label={`${starCount(star)} · ${proficiencyLabels[star]}`} tabIndex={star === (value || 1) ? 0 : -1} className={star <= preview ? 'filled' : ''} onMouseEnter={() => setHover(star)} onBlur={() => setHover(null)} onClick={() => { setHover(null); onChange(star); }} onKeyDown={event => {
        let next = star;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = star === 5 ? 1 : star + 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = star === 1 ? 5 : star - 1;
        else if (event.key === 'Home') next = 1;
        else if (event.key === 'End') next = 5;
        else return;
        event.preventDefault(); setHover(null); onChange(next); refs.current[next - 1]?.focus();
      }}><Star aria-hidden="true"/></button>)}
    </div>
    <p id={descriptionId} className="proficiency-description" role="status">{proficiencyDescriptions[preview]}</p>
    {goalTarget !== undefined && <p className="star-goal-target">Goal target: {starCount(goalTarget)}{value >= goalTarget ? ' · reached' : ` · ${starCount(goalTarget - value)} to go`}</p>}
  </section>;
}
