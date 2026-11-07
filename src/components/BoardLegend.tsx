'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, CircleHelp, Diamond, LockKeyhole, Star, X } from 'lucide-react';

export function SkillLegend() {
  return <div className="skill-legend">
    <h3>Levels and ranks</h3>
    <ul className="level-legend">
      {[['#b4c7e6', '0–2', 'Untrained at 0 · Initiate at 1–2'], ['#67dcf3', '3–4', 'Apprentice'], ['#76b3ff', '5–7', 'Adept'], ['#c5a1ff', '8–9', 'Master'], ['#ffcd73', '10', 'Transcendent']].map(([color, range, label]) => <li key={range}><i style={{ borderColor: color }} aria-hidden="true"/><strong>{range}</strong><span>{label}</span></li>)}
    </ul>
    <h3>Markers</h3>
    <ul className="marker-legend">
      <li><i className="legend-available" aria-hidden="true"/><span>Dashed ring · available to rate</span></li>
      <li><LockKeyhole size={14}/><span>Lock · raise its prerequisites first</span></li>
      <li><i className="legend-suggested" aria-hidden="true"/><span>Gold dot · suggested next skill</span></li>
      <li><Diamond size={14}/><span>Diamond · Mastery milestone skill</span></li>
      <li><Star size={14}/><span>Star · Legendary milestone skill</span></li>
      <li><BookOpen size={14}/><span>Book · linked learning guide</span></li>
    </ul>
    <p>Standard skills build foundations. Mastery and Legendary mark broader milestones, independent of your current level.</p>
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
