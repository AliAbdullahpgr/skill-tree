'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { DependencyPath } from '@/lib/dependencies';
import { skillById } from '@/lib/progression';

export default function PathControl({ path, onFit, onClear, onSelect }: { path: DependencyPath; onFit: () => void; onClear: () => void; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="path-control">
    <div className="path-chip"><button onClick={() => setOpen(!open)} aria-expanded={open}>Path to {skillById.get(path.target)!.name}<small>{path.gaps.length ? `${path.gaps.length} ${path.gaps.length === 1 ? 'prerequisite needs' : 'prerequisites need'} work` : 'Requirements met'} · View steps <ChevronDown size={11}/></small></button><button className="icon-button" aria-label="Clear prerequisite path" onClick={onClear}><X size={14}/></button></div>
    {open && <section className="path-steps" aria-label="Prerequisite steps"><p>Work from the first unmet step upward.</p><ol>{path.requirements.map(item => <li key={item.id}><button onClick={() => { onSelect(item.id); setOpen(false); }}><span><strong>{skillById.get(item.id)!.name}</strong><small>Current {item.current}/10 · needs {item.required}/10{item.met ? ' · Met' : item.blocked ? ' · Earlier step locked' : ` · ${item.missing} levels short`}</small></span><ChevronRight size={14}/></button></li>)}</ol><button className="link-button" aria-label="Fit prerequisite path" onClick={() => { onFit(); setOpen(false); }}>Focus first unmet step</button></section>}
    {!open && <button className="path-focus" aria-label="Fit prerequisite path" onClick={onFit}>Focus first unmet step</button>}
  </div>;
}
