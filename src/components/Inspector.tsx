'use client';
import { lazy, Suspense, type RefObject } from 'react';
import { ChevronRight, Flame, Map, Minus, Network, Plus, Sparkles, X } from 'lucide-react';
import Sigil from './Sigil';
import DependencyGuide from './DependencyGuide';
import type { DependencyPath } from '@/lib/dependencies';
import { skills, skillById, rank, isUnlocked, type Levels, type Skill } from '@/lib/progression';

const MilestoneGuide = lazy(() => import('./MilestoneGuide'));
const RoadmapResources = lazy(() => import('./RoadmapResources'));

type Props = {
  skill: Skill; levels: Levels; unlocked: boolean; draft: number; onDraft: (level: number) => void; onSave: () => void; onClose: () => void;
  color: string; goalTarget?: number; path: DependencyPath | null; bodyRef: RefObject<HTMLDivElement | null>;
  onTrace: () => void; onShowPath: () => void; onClearPath: () => void; onSelect: (id: string) => void;
  sample?: boolean; recommended?: boolean; guideRequest?: number;
};

const kindLabel = (kind: Skill['kind']) => kind === 'normal' ? 'Standard' : kind === 'mastery' ? 'Mastery' : 'Legendary';
const rankHint = (level: number) => level === 10 ? 'Exceptional mastery' : level >= 8 ? 'Master, levels 8–9' : level >= 5 ? 'Adept, levels 5–7' : level >= 3 ? 'Apprentice, levels 3–4' : level > 0 ? 'Initiate, levels 1–2' : 'Untrained';

export default function Inspector({ skill, levels, unlocked, draft, onDraft, onSave, onClose, color, goalTarget, path, bodyRef, onTrace, onShowPath, onClearPath, onSelect, sample, recommended, guideRequest }: Props) {
  const level = levels[skill.id] || 0;
  const unlocks = skills.filter(s => s.prerequisites.some(p => p.id === skill.id)).map(s => s.name);
  return <section className="inspector" aria-label="Skill details">
    <div className="inspector-top"><span>{skill.branch}</span><button className="icon-button" onClick={onClose} aria-label="Close skill details"><X size={16} /></button></div>
    <div className="inspector-hero"><div className={`detail-sigil ${skill.kind} ${unlocked ? '' : 'sealed'}`} style={{ '--branch': color } as React.CSSProperties}><span className="detail-orbit" /><Sigil skill={skill} size={48} /></div><span className={`type-badge ${skill.kind}`} title="Standard skills form the atlas baseline. Mastery and Legendary skills are major milestones.">{kindLabel(skill.kind)} skill</span><h2>{skill.name}</h2><p>{skill.region}{skill.branch !== skill.region && <><ChevronRight size={10} /> {skill.branch}</>}</p></div>
    <div ref={bodyRef} className="inspector-body">
      {sample && <p className="inspector-demo">Demo profile · these are example levels</p>}
      {recommended && <p className="suggested-label">Gold dot · suggested next skill</p>}
      <div className="current-level"><span>{sample ? 'Demo level' : 'Saved level'}</span><strong>{level}<small> / 10</small></strong><em title={rankHint(level)}>{unlocked ? rank(level) : 'Locked'}</em></div>
      {unlocked ? <div className="inspector-section level-editor level-editor-first"><h3>Set your level</h3><p>An honest reflection of what you can do. Changes save to this browser.</p><div className="level-stepper"><button aria-label="Decrease skill level" disabled={draft <= 0} onClick={() => onDraft(Math.max(0, draft - 1))}><Minus size={16} /></button><span><strong>{draft}</strong><small>{rank(draft)}</small></span><button aria-label="Increase skill level" disabled={draft >= 10} onClick={() => onDraft(Math.min(10, draft + 1))}><Plus size={16} /></button></div><input type="range" aria-label="Skill level" min="0" max="10" value={draft} onChange={e => onDraft(Number(e.target.value))} /><div className="range-labels"><span>Untrained</span><span>Exceptional mastery</span></div><Suspense fallback={<p className="quiet-note">Loading level guide…</p>}><MilestoneGuide key={skill.id} skill={skill} level={draft} /></Suspense></div>
        : <div className="inspector-section unlock-requirements"><h3>Unlock requirements</h3><p className="quiet-note">Reach these levels to rate {skill.name}. Open a requirement to work on it now.</p>{skill.prerequisites.length ? skill.prerequisites.map(requirement => {
          const required = skillById.get(requirement.id);
          const current = levels[requirement.id] || 0;
          const missing = Math.max(0, requirement.level - current);
          const blocked = !isUnlocked(requirement.id, levels);
          return <button key={requirement.id} className={`prerequisite ${missing || blocked ? 'requirement-missing' : 'requirement-met'}`} onClick={() => onSelect(requirement.id)}>
            <span><strong>{required?.name ?? requirement.id}</strong><small>Level {current} / {requirement.level} required</small></span>
            <em>{missing ? `${missing} level${missing === 1 ? '' : 's'} short` : blocked ? 'Earlier step locked' : 'Met'}</em>
            <ChevronRight size={15} />
          </button>;
        }) : <p className="quiet-note">This skill is gated by the realm foundation. Select its prerequisite on the board.</p>}<p className="quiet-note">Lowering a prerequisite later reseals this skill but keeps its saved level.</p></div>}
      <p className="skill-description">{skill.description}</p>
      <Suspense fallback={null}><RoadmapResources skillId={skill.id} focusRequest={guideRequest} /></Suspense>
      {goalTarget !== undefined && <p className="goal-target">Goal target · Level {goalTarget} {level >= goalTarget && unlocked ? '✓ Reached' : ''}</p>}
      {skill.prerequisites.length > 0 && <div className="inspector-section"><h3>Full prerequisite path</h3>{path
        ? <DependencyGuide path={path} onSelect={onSelect} onFit={onShowPath} onClear={onClearPath} />
        : <><p className="quiet-note">{skill.prerequisites.length} direct {skill.prerequisites.length === 1 ? 'prerequisite' : 'prerequisites'}. Trace every step and the level it needs.</p><button className="trace-button" onClick={onTrace}>Trace all prerequisites <Network size={15} /></button></>}</div>}
      <div className="next-unlock"><Flame size={18} /><div><h4>What lies beyond</h4><p>{unlocks.join(' · ') || 'The pursuit of exceptional mastery.'}</p></div></div>
    </div>
    <div className="inspector-save">{unlocked
      ? <><span className={`save-hint ${draft === level ? 'saved' : ''}`}>{draft === level ? `Saved at level ${level}.` : `Unsaved: level ${level} → ${draft}.`}</span><button className="gold-button" onClick={onSave} disabled={draft === level}><Sparkles size={15} />{draft === level ? 'Level saved' : 'Save level'}</button></>
      : <button className="gold-button" onClick={onShowPath}><Map size={15} />Show path on board</button>}</div>
  </section>;
}
