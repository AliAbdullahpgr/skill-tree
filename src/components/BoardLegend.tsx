'use client';
import { useEffect, useRef, useState } from 'react';
import { Stars } from './Stars';
import { proficiencyLabels } from '@/lib/proficiency';
import { BookOpen, CircleHelp, Diamond, LockKeyhole, Star, X } from 'lucide-react';

export function SkillLegend() {
  return <div className="skill-legend">
    <h3>Proficiency stars</h3>
    <ul className="level-legend">
      {proficiencyLabels.slice(1).map((label, index) => <li key={label}><i style={{ borderColor: ['#b4c7e6', '#67dcf3', '#76b3ff', '#c5a1ff', '#ffcd73'][index] }} aria-hidden="true"/><Stars value={index + 1}/><span>{label}</span></li>)}
    </ul>
    <h3>Markers</h3>
    <ul className="marker-legend">
      <li><i className="legend-available" aria-hidden="true"/><span>Dashed ring · available to rate</span></li>
      <li><LockKeyhole size={14}/><span>Lock · raise its prerequisites first</span></li>
      <li><i className="legend-suggested" aria-hidden="true"/><span>Gold dot · suggested next skill</span></li>
      <li><Diamond size={14}/><span>Diamond · Mastery milestone skill</span></li>
      <li><Star size={14}/><span>Star · Legendary milestone skill</span></li>
      <li><BookOpen size={14}/><span>Book · linked learning guide (Skills list)</span></li>
    </ul>
    <h3>Highlights</h3>
    <ul className="marker-legend">
      <li><i className="legend-goal" aria-hidden="true"/><span>Green outline · part of your goal</span></li>
      <li><i className="legend-path" aria-hidden="true"/><span>Gold outline and line · prerequisite path</span></li>
      <li><i className="legend-gap" aria-hidden="true"/><span>Amber dashed outline · skill gap (Gaps on)</span></li>
      <li><i className="legend-faded" aria-hidden="true"/><span>Faded · outside your goal (within goal branches), path, or the branch on screen</span></li>
    </ul>
    <p>Standard skills build foundations. Mastery and Legendary mark broader milestones, independent of your proficiency. No filled stars means not rated.</p>
  </div>;
}

export default function BoardLegend({ onHelp }: { onHelp: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); };
  }, [open]);
  return <div className="board-key" ref={ref}>
    <button className="legend-trigger" aria-expanded={open} onClick={() => setOpen(!open)}><CircleHelp size={16}/>Legend</button>
    {open && <section className="legend-panel" aria-label="Board legend"><div className="legend-heading"><strong>Read the board</strong><button className="icon-button" aria-label="Close legend" onClick={() => setOpen(false)}><X size={16}/></button></div><SkillLegend/><button className="link-button" onClick={() => { setOpen(false); onHelp(); }}>How to use the board</button></section>}
  </div>;
}
