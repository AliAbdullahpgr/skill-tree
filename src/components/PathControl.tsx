'use client';
import { starCount } from '@/lib/proficiency';
import { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { DependencyPath } from '@/lib/dependencies';
import { skillById } from '@/lib/progression';

const nameOf = (id: string) => skillById.get(id)!.name;

export default function PathControl({ path, onFit, onClear, onSelect, onOpenTarget }: { path: DependencyPath; onFit: () => void; onClear: () => void; onSelect: (id: string) => void; onOpenTarget: () => void }) {
  const [open, setOpen] = useState(false);
  // When every requirement is met the action focuses the target itself, not a step that does not exist.
  const first = path.gaps.find(item => !item.blocked);
  const focusLabel = first ? `Focus first step: ${nameOf(first.id)}` : `Focus ${nameOf(path.target)}`;
  return <div className="path-control">
    <div className="path-chip"><button onClick={() => setOpen(!open)} aria-expanded={open}>Path to {skillById.get(path.target)!.name}<small>{path.gaps.length ? `${path.gaps.length} ${path.gaps.length === 1 ? 'prerequisite needs' : 'prerequisites need'} work` : 'Requirements met'} · View steps <ChevronDown size={11}/></small></button><button className="icon-button" aria-label="Clear prerequisite path" onClick={onClear}><X size={14}/></button></div>
    {open && <section className="path-steps" aria-label="Prerequisite steps"><p>{path.gaps.length ? 'Work from the first unmet step upward.' : `All prerequisites met. ${nameOf(path.target)} is ready to rate.`}</p><ol>{path.requirements.map(item => <li key={item.id}><button onClick={() => { onSelect(item.id); setOpen(false); }}><span><strong>{skillById.get(item.id)!.name}</strong><small>{starCount(item.current)} · needs {starCount(item.required)}{item.met ? ' · Met' : item.blocked ? ' · Earlier step locked' : ` · ${starCount(item.missing)} short`}</small></span><ChevronRight size={14}/></button></li>)}</ol><button className="link-button" onClick={() => { onFit(); setOpen(false); }}>{focusLabel}</button></section>}
    {!open && <div className="path-focus-row"><button className="path-focus" onClick={onFit}>{focusLabel}</button><button className="path-focus" onClick={onOpenTarget}>Back to {nameOf(path.target)} card</button></div>}
  </div>;
}
