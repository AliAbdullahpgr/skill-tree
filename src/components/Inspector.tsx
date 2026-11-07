'use client';
import { lazy, Suspense, useState, type RefObject } from 'react';
import { Check, ChevronRight, LockKeyhole, Map, Network, X } from 'lucide-react';
import Sigil from './Sigil';
import StarRating from './Stars';
import { starCount } from '@/lib/proficiency';
import DependencyGuide from './DependencyGuide';
import { lockReason, type DependencyPath } from '@/lib/dependencies';
import { skillById, isUnlocked, isStructural, raisePrerequisites, type Levels, type Skill } from '@/lib/progression';
import { hasRoadmapGuide } from '@/lib/roadmap';

const MilestoneGuide = lazy(() => import('./MilestoneGuide'));
const RoadmapResources = lazy(() => import('./RoadmapResources'));

type Props = {
  skill: Skill; levels: Levels; unlocked: boolean; onSave: (rating: number) => void; onClose: () => void;
  color: string; goalTarget?: number; path: DependencyPath | null; bodyRef: RefObject<HTMLDivElement | null>;
  onTrace: () => void; onShowPath: () => void; onFocusPath: () => void; onClearPath: () => void; onSelect: (id: string) => void;
  onRaisePrerequisites: () => void; guideRequest?: number;
};

const nameOf = (id: string) => skillById.get(id)?.name ?? id;

export default function Inspector({ skill, levels, unlocked, onSave, onClose, color, goalTarget, path, bodyRef, onTrace, onShowPath, onFocusPath, onClearPath, onSelect, onRaisePrerequisites, guideRequest }: Props) {
  const level = levels[skill.id] || 0;
  const requirements = skill.prerequisites.filter(requirement => !isStructural(requirement.id));
  const lock = unlocked ? null : lockReason(skill.id, levels);
  const raise = unlocked ? [] : raisePrerequisites(levels, skill.id).changes;
  const [confirmRaise, setConfirmRaise] = useState<string | null>(null);
  return <section className="inspector inspector-focused" aria-label="Skill details">
    <div className="inspector-hero">
      <div className={`detail-sigil ${unlocked ? '' : 'sealed'}`} style={{ '--branch': color } as React.CSSProperties}><Sigil skill={skill} size={36}/></div>
      <p className="inspector-context">{skill.branch}</p>
      <h2>{skill.name}</h2>
      <button className="icon-button inspector-close" onClick={onClose} aria-label="Close skill details"><X size={18}/></button>
    </div>
    <div ref={bodyRef} className="inspector-body">
      {lock && <section className="locked-note" aria-label="Locked">
        <p><LockKeyhole size={14} aria-hidden="true"/><span><strong>Locked.</strong> Raise {nameOf(lock.blocker.id)} to {starCount(lock.blocker.required)} to rate {skill.name}.{lock.start.id !== lock.blocker.id && <> Start with {nameOf(lock.start.id)} ({starCount(lock.start.current)} now, needs {starCount(lock.start.required)}).</>}</span></p>
        {raise.length > 0 && (confirmRaise !== skill.id
          ? <button className="link-button" onClick={() => setConfirmRaise(skill.id)}>I already know {skill.name}</button>
          : <div className="raise-confirm" role="alert">
            <p>This sets {raise.length === 1 ? 'one prerequisite' : `${raise.length} prerequisites`} to the minimum needed: {raise.map(change => `${nameOf(change.id)} ${starCount(change.to)}`).join(', ')}. You can adjust them later.</p>
            <div><button className="gold-button" onClick={() => { setConfirmRaise(null); onRaisePrerequisites(); }}>Set and rate {skill.name}</button><button className="link-button" onClick={() => setConfirmRaise(null)}>Cancel</button></div>
          </div>)}
      </section>}
      {requirements.length > 0 && <section className="unlock-requirements" aria-label="Skill prerequisites">
        <div className="prerequisite-heading"><h3>Prerequisites</h3><button onClick={onShowPath} className="prerequisite-path"><Map size={13}/>View path</button></div>
        {requirements.map(requirement => {
          const current = levels[requirement.id] || 0;
          const met = current >= requirement.level && isUnlocked(requirement.id, levels);
          return <button key={requirement.id} className={`prerequisite ${met ? 'requirement-met' : 'requirement-missing'}`} onClick={() => onSelect(requirement.id)}>
            <span><strong>{nameOf(requirement.id)}</strong><small>You {current}/5 · needs {requirement.level}/5{met ? ' · met' : ''}</small></span>
            {met ? <Check size={16} aria-hidden="true"/> : <ChevronRight size={16} aria-hidden="true"/>}
          </button>;
        })}
      </section>}
      {unlocked && <StarRating value={level} onChange={onSave} goalTarget={goalTarget}/>}
      {hasRoadmapGuide(skill.id)
        ? <Suspense fallback={<p className="quiet-note">Loading roadmap guide…</p>}><RoadmapResources skillId={skill.id} focusRequest={guideRequest}/></Suspense>
        : <><p className="skill-description">{skill.description}</p><p className="quiet-note">No roadmap.sh guide is linked for this skill yet. The proficiency guide below has a practice task.</p></>}
      {unlocked && <details key={skill.id} className="assessment-details"><summary>Proficiency guide and practice task</summary><Suspense fallback={<p className="quiet-note">Loading proficiency guide…</p>}><MilestoneGuide key={skill.id} skill={skill} level={level}/></Suspense></details>}
      {(requirements.length > 0 || (path && path.target !== skill.id)) && <details key={`${skill.id}-${path?.target ?? ''}`} className="all-prerequisites" open={!!path}>
        <summary onClick={event => { const details = event.currentTarget.parentElement as HTMLDetailsElement; if (!details.open) requestAnimationFrame(() => details.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); }}>Full prerequisite path</summary>
        {path ? <DependencyGuide path={path} onSelect={onSelect} onFit={onFocusPath} onClear={onClearPath}/> : <button className="trace-button" onClick={onTrace}>Trace all prerequisites <Network size={15}/></button>}
      </details>}
    </div>
  </section>;
}
