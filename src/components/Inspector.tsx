'use client';
import { lazy, Suspense, type RefObject } from 'react';
import { ChevronRight, Flame, LockKeyhole, Map, Minus, Network, Plus, Sparkles, X } from 'lucide-react';
import Sigil from './Sigil';
import DependencyGuide from './DependencyGuide';
import type { DependencyPath } from '@/lib/dependencies';
import { skills, rank, type Levels, type Skill } from '@/lib/progression';

const MilestoneGuide = lazy(() => import('./MilestoneGuide'));

type Props = {
  skill: Skill; levels: Levels; unlocked: boolean; draft: number; onDraft: (level: number) => void; onSave: () => void; onClose: () => void;
  color: string; goalTarget?: number; path: DependencyPath | null; bodyRef: RefObject<HTMLDivElement | null>;
  onTrace: () => void; onShowPath: () => void; onClearPath: () => void; onSelect: (id: string) => void;
};

export default function Inspector({ skill, levels, unlocked, draft, onDraft, onSave, onClose, color, goalTarget, path, bodyRef, onTrace, onShowPath, onClearPath, onSelect }: Props) {
  const level = levels[skill.id] || 0;
  const unlocks = skills.filter(s => s.prerequisites.some(p => p.id === skill.id)).map(s => s.name);
  return <section className="inspector" aria-label="Skill details">
    <div className="inspector-top"><span>{skill.branch}</span><button className="icon-button" onClick={onClose} aria-label="Close skill details"><X size={16} /></button></div>
    <div className="inspector-hero"><div className={`detail-sigil ${skill.kind} ${unlocked ? '' : 'sealed'}`} style={{ '--branch': color } as React.CSSProperties}><span className="detail-orbit" /><Sigil skill={skill} size={48} /></div><span className={`type-badge ${skill.kind}`}>{skill.kind} skill</span><h2>{skill.name}</h2><p>{skill.region} <ChevronRight size={10} /> {skill.branch}</p></div>
    <div ref={bodyRef} className="inspector-body">
      <div className="current-level"><span>Current level</span><strong>{level}<small> / 10</small></strong><em>{unlocked ? rank(level) : 'Locked'}</em></div>
      <div className="level-pips">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < level && unlocked ? 'filled' : ''} />)}</div>
      <p className="skill-description">{skill.description}</p>
      {goalTarget !== undefined && <p className="goal-target">Goal target · Level {goalTarget} {level >= goalTarget && unlocked ? '✓ Reached' : ''}</p>}
      {skill.prerequisites.length > 0 && <div className="inspector-section"><h3>Prerequisite path</h3>{path
        ? <DependencyGuide path={path} onSelect={onSelect} onFit={onShowPath} onClear={onClearPath} />
        : <><p className="quiet-note">{skill.prerequisites.length} direct {skill.prerequisites.length === 1 ? 'prerequisite' : 'prerequisites'}. Trace every step and the level it needs.</p><button className="trace-button" onClick={onTrace}>Trace all prerequisites <Network size={15} /></button></>}</div>}
      {unlocked
        ? <div className="inspector-section level-editor"><h3>Set your level</h3><p>An honest reflection of what you can do.</p><div className="level-stepper"><button aria-label="Decrease skill level" disabled={draft <= 0} onClick={() => onDraft(Math.max(0, draft - 1))}><Minus size={16} /></button><span><strong>{draft}</strong><small>{rank(draft)}</small></span><button aria-label="Increase skill level" disabled={draft >= 10} onClick={() => onDraft(Math.min(10, draft + 1))}><Plus size={16} /></button></div><input type="range" aria-label="Skill level" min="0" max="10" value={draft} onChange={e => onDraft(Number(e.target.value))} /><div className="range-labels"><span>Untrained</span><span>Exceptional mastery</span></div><Suspense fallback={<p className="quiet-note">Loading level guide…</p>}><MilestoneGuide key={skill.id} skill={skill} level={draft} /></Suspense></div>
        : <div className="inspector-section locked-note"><LockKeyhole size={16} /><p>Locked until every prerequisite above reaches its required level.{level > 0 && ` Your recorded level ${level} returns when it unlocks.`}</p></div>}
      <div className="next-unlock"><Flame size={18} /><div><h4>What lies beyond</h4><p>{unlocks.join(' · ') || 'The pursuit of exceptional mastery.'}</p></div></div>
    </div>
    <div className="inspector-save">{unlocked
      ? <button className="gold-button" onClick={onSave} disabled={draft === level}><Sparkles size={15} />Save level</button>
      : <button className="gold-button" onClick={onShowPath}><Map size={15} />Show path on board</button>}</div>
  </section>;
}
