'use client';
import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, LockKeyhole, ScrollText, Search, X } from 'lucide-react';
import Sigil from './Sigil';
import { skills, skillById, isUnlocked, rank, type Levels } from '@/lib/progression';
import { hasRoadmapGuide } from '@/lib/roadmap';
import { dependencyPath } from '@/lib/dependencies';
import { SkillLegend } from './BoardLegend';

export type Entry = { name: string; from: number; to: number; at: string; sample?: boolean };
type Filter = 'all' | 'unlocked' | 'locked';
const regions = ['Engineering', 'Problem Solving', 'Personal Skills'];
// The realm root gates its branches but is not a skill to train, so the codex leaves it out.
const codexSkills = skills.filter(s => s.branch !== 'Core');
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
  return <div className="library-overlay" role="region" aria-label={tab === 'codex' ? 'Skill library' : 'Level history'}>
    <div className="library-heading"><div><h1>{tab === 'codex' ? 'Codex · Skill library' : hasSample ? 'Chronicle · Demo history' : 'Chronicle · Level history'}</h1><p>{tab === 'codex' ? `${codexSkills.length} skills; the shared Engineering foundation is excluded. ${guidedSkills} have linked guides.` : 'Level changes in this browser, newest first.'}</p></div><button className="icon-button" aria-label="Return to skill board" onClick={onClose}><X size={22} /></button></div>
    {tab === 'codex' ? <>
      <div className="codex-tools">
        <div className="codex-search"><Search size={16} /><input aria-label="Filter the codex" placeholder="Filter skills or branches…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Clear codex filter" onClick={() => setQuery('')}><X size={14} /></button>}</div>
        <div className="codex-filters" role="group" aria-label="Show skills">{(['all', 'unlocked', 'locked'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'unlocked' ? 'Available' : 'Locked'}</button>)}</div>
        <span className="codex-count" aria-live="polite">{visible.length} match{visible.length === 1 ? '' : 'es'}</span>
      </div>
      <p className="codex-legend"><BookOpen size={12} /> linked guide <span>·</span> Available = ready to rate <span>·</span> levels 0–10</p>
      <details className="codex-key"><summary>Level ranks and skill types</summary><SkillLegend/></details>
      <div className="codex-list">{regions.map(r => {
        const list = visible.filter(s => s.region === r);
        if (!list.length) return null;
        return <section key={r}><h2>{r}<small>{list.length} skills</small></h2><div className="codex-grid">{list.map(s => {
          const open = isUnlocked(s.id, levels), level = levels[s.id] || 0;
          const unmet = open ? null : dependencyPath(s.id, levels).gaps[0];
          const state = open ? (level ? rank(level) : 'Ready to rate') : unmet ? `Locked · needs ${skillById.get(unmet.id)?.name} at level ${unmet.required} (now ${unmet.current})` : 'Locked';
          return <button key={s.id} onClick={() => onSelect(s.id)}><Sigil skill={s} /><span>{s.name}<small>{kindLabel(s.kind)} · {state}</small>{!open && level > 0 && <small>Saved level {level} preserved</small>}</span>{hasRoadmapGuide(s.id) && <span className="codex-guide" title="Linked roadmap guide"><BookOpen size={13} aria-label="Has a roadmap guide" /></span>}{open ? <strong title={`Level ${level} of 10`}>{level}<small>/10</small></strong> : <LockKeyhole size={16} />}<ChevronRight size={14} className="codex-chevron" /></button>;
        })}</div></section>;
      })}{!visible.length && <p className="codex-empty">No skills match {query ? `“${query}”` : 'the current filter'}. <button className="link-button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></p>}</div>
    </> : <div className="chronicle-list">{hasSample && <p className="chronicle-note">EXAMPLE entries belong to the demo profile. Your new saves have no example badge. Use “Reset progress” in Settings to clear both and start your own profile.</p>}{history.length ? history.map((entry, i) => <div key={`${entry.at}-${i}`}><span className="history-rune">✧</span><div><h3>{entry.name}{entry.sample && <em className="sample-tag">Example</em>}</h3><p>Level {entry.from} <ChevronRight size={12} /> Level {entry.to}</p></div><time dateTime={entry.at} title={new Date(entry.at).toLocaleString()}>{when(entry.at)}</time></div>) : <div className="empty-chronicle"><ScrollText size={36} /><h2>No changes yet.</h2><p>Choose a skill on the board and save your level to start your chronicle.</p><button className="gold-button" onClick={onClose}>Back to the board</button></div>}</div>}
  </div>;
}
