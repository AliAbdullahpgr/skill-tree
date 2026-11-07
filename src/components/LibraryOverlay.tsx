'use client';
import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, LockKeyhole, ScrollText, Search, X } from 'lucide-react';
import Sigil from './Sigil';
import { Stars } from './Stars';
import { plural, starCount } from '@/lib/proficiency';
import { trainableSkills, skillById, isUnlocked, rank, type Levels } from '@/lib/progression';
import { hasRoadmapGuide } from '@/lib/roadmap';
import { lockReason } from '@/lib/dependencies';
import { SkillLegend } from './BoardLegend';

export type Entry = { name: string; from: number; to: number; at: string; sample?: boolean };
type Filter = 'all' | 'unlocked' | 'locked';
const regions = ['Engineering', 'Problem Solving', 'Personal Skills'];
const codexSkills = trainableSkills;
const skillByName = new Map(codexSkills.map(s => [s.name, s]));
const guidedSkills = codexSkills.filter(s => hasRoadmapGuide(s.id)).length;
const kindLabel = (kind: string) => kind === 'normal' ? 'Standard' : kind === 'mastery' ? 'Mastery' : 'Legendary';
const when = (iso: string) => {
  const date = new Date(iso), now = new Date();
  return date.toDateString() === now.toDateString()
    ? `Today ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function LibraryOverlay({ tab, levels, history, onClose, onSelect }: { tab: 'codex' | 'chronicle'; levels: Levels; history: Entry[]; onClose: () => void; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codexSkills.filter(s => (!q || `${s.name} ${s.branch}`.toLowerCase().includes(q)) && (filter === 'all' || (filter === 'unlocked') === isUnlocked(s.id, levels)));
  }, [query, filter, levels]);
  const hasSample = history.some(entry => entry.sample);
  // Entries with no change carry no information.
  const changes = history.filter(entry => entry.from !== entry.to);
  return <div className="library-overlay" role="region" aria-label={tab === 'codex' ? 'Skill library' : 'Rating history'}>
    <div className="library-heading"><div><h1>{tab === 'codex' ? 'Skill library' : hasSample ? 'Demo history' : 'Rating history'}</h1><p>{tab === 'codex' ? `${codexSkills.length} skills · ${guidedSkills} have linked guides.` : 'Rating changes in this browser, newest first. Choose an entry to open the skill.'}</p></div><button className="icon-button" aria-label="Return to skill board" onClick={onClose}><X size={22} /></button></div>
    {tab === 'codex' ? <>
      <div className="codex-tools">
        <div className="codex-search"><Search size={16} /><input aria-label="Filter skills" placeholder="Filter skills or branches…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Clear skill filter" onClick={() => setQuery('')}><X size={14} /></button>}</div>
        <div className="codex-filters" role="group" aria-label="Show skills">{(['all', 'unlocked', 'locked'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'unlocked' ? 'Available' : 'Locked'}</button>)}</div>
        <span className="codex-count" aria-live="polite">{visible.length} match{visible.length === 1 ? '' : 'es'}</span>
      </div>
      <p className="codex-legend"><BookOpen size={12} /> linked guide <span>·</span> Available = ready to rate <span>·</span> proficiency: 1–5 stars</p>
      <details className="codex-key"><summary>Proficiency and skill types</summary><SkillLegend/></details>
      <div className="codex-list">{regions.map(r => {
        const list = visible.filter(s => s.region === r);
        if (!list.length) return null;
        // Branch subheadings give long realms landmarks; skills keep their board order within a branch.
        const groups = [...new Set(list.map(s => s.branch))].map(branch => [branch, list.filter(s => s.branch === branch)] as const);
        return <section key={r}><h2>{r}<small>{plural(list.length, 'skill')}</small></h2>{groups.map(([branch, items]) => <div key={branch} className="codex-branch">{branch !== r && <h3>{branch}<small>{plural(items.length, 'skill')}</small></h3>}<div className="codex-grid">{items.map(s => {
          const open = isUnlocked(s.id, levels), level = levels[s.id] || 0;
          const lock = open ? null : lockReason(s.id, levels);
          const name = (id: string) => skillById.get(id)?.name;
          const state = open ? (level ? rank(level) : 'Ready to rate') : lock ? `Locked · needs ${name(lock.blocker.id)} at ${starCount(lock.blocker.required)} (now ${starCount(lock.blocker.current)})${lock.start.id !== lock.blocker.id ? ` · start with ${name(lock.start.id)}` : ''}` : 'Locked';
          return <button key={s.id} onClick={() => onSelect(s.id)}><Sigil skill={s} /><span>{s.name}<small>{kindLabel(s.kind)} · {state}</small>{!open && level > 0 && <small>Saved {starCount(level)} preserved</small>}</span>{hasRoadmapGuide(s.id) && <span className="codex-guide" title="Linked roadmap guide"><BookOpen size={13} aria-label="Has a roadmap guide" /></span>}{open ? <Stars value={level} className="codex-stars"/> : <LockKeyhole size={16} />}<ChevronRight size={14} className="codex-chevron" /></button>;
        })}</div></div>)}</section>;
      })}{!visible.length && <p className="codex-empty">No skills match {query ? `“${query}”` : 'the current filter'}. <button className="link-button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></p>}</div>
    </> : <div className="chronicle-list">{changes.length ? changes.map((entry, i) => { const skill = skillByName.get(entry.name); return <button key={`${entry.at}-${i}`} className="chronicle-entry" disabled={!skill} onClick={() => skill && onSelect(skill.id)}>{skill ? <Sigil skill={skill} size={22} /> : <span className="history-rune" aria-hidden="true" />}<div><h3>{entry.name}{entry.sample && <em className="sample-tag">Example</em>}</h3><p><Stars value={entry.from}/><ChevronRight size={12} aria-label="to"/><Stars value={entry.to}/></p></div><time dateTime={entry.at} title={new Date(entry.at).toLocaleString()}>{when(entry.at)}</time>{skill && <ChevronRight size={14} className="codex-chevron" aria-hidden="true" />}</button>; }) : <div className="empty-chronicle"><ScrollText size={36} /><h2>No changes yet.</h2><p>Choose a skill on the board and choose a star rating to start your history.</p><button className="gold-button" onClick={onClose}>Back to the board</button></div>}</div>}
  </div>;
}
