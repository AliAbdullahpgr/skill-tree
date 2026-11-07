'use client';
import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, LockKeyhole, ScrollText, Search, X } from 'lucide-react';
import Sigil from './Sigil';
import { skills, isUnlocked, rank, type Levels } from '@/lib/progression';
import { hasRoadmapGuide } from '@/lib/roadmap';

export type Entry = { name: string; from: number; to: number; at: string; sample?: boolean };
type Filter = 'all' | 'unlocked' | 'locked';
const regions = ['Engineering', 'Problem Solving', 'Personal Skills'];
// The realm root gates its branches but is not a skill to train, so the codex leaves it out.
const codexSkills = skills.filter(s => s.branch !== 'Core');
const guidedSkills = codexSkills.filter(s => hasRoadmapGuide(s.id)).length;

export default function LibraryOverlay({ tab, levels, history, onClose, onSelect }: { tab: 'codex' | 'chronicle'; levels: Levels; history: Entry[]; onClose: () => void; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codexSkills.filter(s => (!q || `${s.name} ${s.branch}`.toLowerCase().includes(q)) && (filter === 'all' || (filter === 'unlocked') === isUnlocked(s.id, levels)));
  }, [query, filter, levels]);
  return <div className="library-overlay">
    <div className="library-heading"><div><h1>{tab === 'codex' ? 'The codex' : 'Chronicle'}</h1><p>{tab === 'codex' ? `Every skill, searchable in one list. ${guidedSkills} include a linked roadmap guide.` : 'Every level you save, newest first.'}</p></div><button className="icon-button" aria-label="Return to skill board" onClick={onClose}><X size={22} /></button></div>
    {tab === 'codex' ? <>
      <div className="codex-tools">
        <label className="codex-search"><Search size={16} /><input aria-label="Filter the codex" placeholder="Filter skills or branches…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <div className="codex-filters" role="group" aria-label="Show skills">{(['all', 'unlocked', 'locked'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'unlocked' ? 'Unlocked' : 'Locked'}</button>)}</div>
      </div>
      <div className="codex-list">{regions.map(r => {
        const list = visible.filter(s => s.region === r);
        if (!list.length) return null;
        return <section key={r}><h2>{r}<small>{list.length} skills</small></h2><div className="codex-grid">{list.map(s => {
          const open = isUnlocked(s.id, levels), level = levels[s.id] || 0;
          return <button key={s.id} onClick={() => onSelect(s.id)}><Sigil skill={s} /><span>{s.name}<small>{s.kind} · {open ? rank(level) : level ? `Locked · level ${level} kept` : 'Locked'}</small></span>{hasRoadmapGuide(s.id) && <BookOpen size={13} className="codex-guide" aria-label="Has a roadmap guide" />}{open ? <strong>{level}<small>/10</small></strong> : <LockKeyhole size={16} />}</button>;
        })}</div></section>;
      })}{!visible.length && <p className="codex-empty">No skills match. Clear the filter to see all {codexSkills.length}.</p>}</div>
    </> : <div className="chronicle-list">{history.length ? history.map((entry, i) => <div key={`${entry.at}-${i}`}><span className="history-rune">✧</span><div><h3>{entry.name}{entry.sample && <em className="sample-tag">Example</em>}</h3><p>Level {entry.from} <ChevronRight size={12} /> Level {entry.to}</p></div><time>{new Date(entry.at).toLocaleString()}</time></div>) : <div className="empty-chronicle"><ScrollText size={36} /><h2>No changes yet.</h2><p>Choose a skill on the board and save your level to start your chronicle.</p><button className="gold-button" onClick={onClose}>Back to the board</button></div>}</div>}
  </div>;
}
