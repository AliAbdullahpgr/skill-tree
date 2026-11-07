'use client';
import { starCount } from '@/lib/proficiency';
import { Check, ArrowUpRight } from 'lucide-react';
import { skillById } from '@/lib/progression';
import type { DependencyPath } from '@/lib/dependencies';

export default function DependencyGuide({ path, onSelect, onFit, onClear }: { path: DependencyPath; onSelect: (id: string) => void; onFit: () => void; onClear: () => void }) {
  return <section className="dependency-guide" aria-label="Full prerequisite path">
    <div className="dependency-heading"><span>Path to</span><strong>{skillById.get(path.target)!.name}</strong></div>
    <p>{path.gaps.length ? `${path.gaps.length} ${path.gaps.length === 1 ? 'prerequisite still needs' : 'prerequisites still need'} work. Follow the chain from foundations upward.` : `All prerequisites are met. ${skillById.get(path.target)!.name} is ready to rate.`}</p>
    <div className="path-actions"><button onClick={onFit}>Focus path on board <ArrowUpRight size={13}/></button><button onClick={onClear}>Clear path</button></div>
    <ol>{path.requirements.map(item => <li key={item.id}><button onClick={() => onSelect(item.id)} className={item.met ? 'requirement-met' : 'requirement-missing'}><span><strong>{skillById.get(item.id)!.name}</strong><small>{starCount(item.current)} · needs {starCount(item.required)}</small><small>{item.met ? 'Requirement met' : item.blocked ? 'Earlier prerequisites must unlock first' : 'Ready to raise now'}</small></span>{item.met ? <Check size={15}/> : <span className="missing-badge">{item.missing ? `${starCount(item.missing)} short` : 'Locked'}</span>}</button></li>)}</ol>
    {!path.requirements.length && <p>This is a starting skill with no prerequisites.</p>}
  </section>;
}
