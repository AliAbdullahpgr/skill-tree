'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ReactFlow, ReactFlowProvider, Handle, Position, useReactFlow, MiniMap, type NodeProps, type Node, type Edge } from '@xyflow/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { Sparkles, Compass, Code2, Network, Brain, Gem, LockKeyhole, ChevronRight, ChevronDown, Check, X, Plus, Minus, Maximize, Volume2, VolumeX, Settings2, Search, ScrollText, Crosshair, Download, Upload, RotateCcw, Shield, Flame, BookOpen, ArrowUpRight, Menu } from 'lucide-react';
import { skills, initialLevels, isUnlocked, normalizeLevels, updateLevel, rank, STORAGE_KEY, type Skill, type Levels } from '@/lib/progression';
import '@xyflow/react/dist/style.css';

type SkillData = { skill: Skill; level: number; unlocked: boolean; selected: boolean; gaps: boolean };
type SkillNode = Node<SkillData, 'skill'>;
type Entry = { name: string; from: number; to: number; at: string };
const branchColors: Record<string, string> = { Frontend: '#60c9bb', Backend: '#c3a16d', Databases: '#7daed3', 'System Design': '#b7a17d', AI: '#a99ac5', DSA: '#a6b585', Core: '#d1b77b', 'Problem Solving': '#a6b585', 'Personal Skills': '#bd9dcb' };
const regions = ['Engineering', 'Problem Solving', 'Personal Skills'];
const branches = ['Frontend', 'Backend', 'Databases', 'System Design', 'AI', 'DSA'];
const icons: Record<string, typeof Code2> = { Engineering: Code2, 'Problem Solving': Brain, 'Personal Skills': Sparkles };
function Sigil({ skill, size = 24 }: { skill: Skill; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (skill.icon && !failed) return <img alt="" width={size} height={size} src={`/icons/${skill.icon}.svg`} onError={() => setFailed(true)} draggable={false} />;
  const Icon = skill.id === 'engineering' ? Compass : skill.kind === 'legendary' ? Gem : skill.branch === 'AI' ? Brain : skill.branch === 'DSA' ? Network : skill.branch === 'System Design' ? Shield : skill.branch === 'Databases' ? Network : Code2;
  return <Icon size={size} strokeWidth={1.3} />;
}
const RuneNode = memo(function RuneNode({ data }: NodeProps<SkillNode>) {
  const { skill, level, unlocked, selected, gaps } = data;
  return <div className={`rune-node ${skill.kind} ${unlocked ? 'awakened' : 'locked'} ${selected ? 'chosen' : ''} ${level >= 8 ? 'high-level' : ''} ${gaps && level >= 5 && unlocked ? 'dimmed' : ''}`} style={{ '--branch': branchColors[skill.branch], '--power': .15 + level * .045 } as React.CSSProperties}>
    <Handle type="target" position={Position.Top} /><Handle type="source" position={Position.Bottom} />
    <div className="rune-orbit" /><div className="rune-ring"><div className="rune-inner"><Sigil skill={skill} size={skill.id === 'engineering' ? 38 : 29} /></div></div>
    {skill.kind !== 'normal' && <span className="rune-crown">{skill.kind === 'legendary' ? '✧' : '◆'}</span>}
    <span className="node-level">{unlocked ? `${level} / 10` : <LockKeyhole size={10} />}</span>
    <div className="node-caption">{skill.name}</div>
    <div className="node-tooltip"><strong>{skill.name}</strong><span>{unlocked ? `${rank(level)} · Level ${level}` : 'Sealed knowledge'}</span>{skill.prerequisites.map(p => <small key={p.id}>{skills.find(s => s.id === p.id)?.name} · requires Lv. {p.level}</small>)}</div>
  </div>;
});
const nodeTypes = { skill: RuneNode };

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let frame = 0; let tick = 0; const motes = Array.from({ length: 45 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + .3, v: .00005 + Math.random() * .0001 }));
    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const draw = () => { tick++; ctx.clearRect(0, 0, canvas.width, canvas.height); motes.forEach((p, i) => { p.y -= p.v; if (p.y < 0) p.y = 1; ctx.beginPath(); ctx.fillStyle = `rgba(218,190,122,${.13 + .25 * (1 + Math.sin(tick / 70 + i)) / 2})`; ctx.arc(p.x * canvas.width + Math.sin(tick / 140 + i) * 9, p.y * canvas.height, p.r, 0, Math.PI * 2); ctx.fill(); }); frame = requestAnimationFrame(draw); }; draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [reduced]);
  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}

function Atlas() {
  const flow = useReactFlow<SkillNode>();
  const reduced = useReducedMotion();
  const [levels, setLevels] = useState<Levels>(initialLevels);
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('react');
  const [region, setRegion] = useState('Engineering');
  const [branch, setBranch] = useState('All branches');
  const [draft, setDraft] = useState(3);
  const [tab, setTab] = useState('atlas');
  const [modal, setModal] = useState<'settings' | 'help' | null>(null);
  const [theme, setTheme] = useState('obsidian');
  const [sound, setSound] = useState(false);
  const [gaps, setGaps] = useState(false);
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(55);
  const [history, setHistory] = useState<Entry[]>([]);
  const [notice, setNotice] = useState('');
  const [cinematic, setCinematic] = useState<Skill | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [sample, setSample] = useState(true);
  const flash = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = skills.find(s => s.id === selectedId)!;
  const unlocked = isUnlocked(selectedId, levels);
  const learned = skills.filter(s => levels[s.id] > 0 && isUnlocked(s.id, levels));
  const mastered = learned.filter(s => levels[s.id] >= 8);
  const total = learned.reduce((sum, s) => sum + levels[s.id], 0);
  const available = skills.filter(s => isUnlocked(s.id, levels)).length;
  const navigate = useCallback((targetRegion: string, targetBranch = 'All branches') => {
    setRegion(targetRegion); setBranch(targetBranch); setMobileNav(false);
    const ids = skills.filter(s => s.region === targetRegion && (targetBranch === 'All branches' || s.branch === targetBranch)).map(s => ({ id: s.id }));
    flow.fitView({ nodes: ids, padding: .22, duration: reduced ? 0 : 1000, maxZoom: 1.25 });
  }, [flow, reduced]);
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const saved = JSON.parse(raw); setLevels(normalizeLevels(saved.levels)); setHistory(Array.isArray(saved.history) ? saved.history.filter((e: Entry) => typeof e.name === 'string' && typeof e.at === 'string' && Number.isFinite(e.from) && Number.isFinite(e.to)).slice(0, 100) : []); setSample(saved.sample === true); if (['obsidian', 'moonstone'].includes(saved.theme)) setTheme(saved.theme); } } catch { setNotice('Your save could not be read. The example build is loaded.'); }
    if (window.innerWidth <= 760) setInspectorOpen(false);
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, levels, history, theme, sample })); } catch { setStorageOk(false); setNotice('Storage unavailable. Export a backup to keep your progress.'); } } }, [levels, ready, history, theme, sample]);
  useEffect(() => { setDraft(levels[selectedId] || 0); }, [selectedId, levels]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { if (!cinematic) return; const t = setTimeout(() => setCinematic(null), 3800); return () => clearTimeout(t); }, [cinematic]);
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setModal(null); setCinematic(null); setQuery(''); setMobileNav(false); } }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, []);
  useEffect(() => () => { audio.current?.close(); }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;
      const elements = Array.from(modalRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([hidden]), a[href], [tabindex="0"]'));
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [modal]);
  const playChime = () => { if (!sound) return; try { const ctx = audio.current || new AudioContext(); audio.current = ctx; void ctx.resume(); [261.63, 392, 523.25, 783.99].forEach((freq, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0, ctx.currentTime + i * .12); g.gain.linearRampToValueAtTime(.055, ctx.currentTime + i * .12 + .03); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .12 + 1.2); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * .12); o.stop(ctx.currentTime + i * .12 + 1.3); }); } catch { setNotice('Audio is unavailable in this browser.'); } };
  const nodes: SkillNode[] = useMemo(() => skills.map(skill => ({ id: skill.id, type: 'skill', position: { x: skill.x, y: skill.y }, data: { skill, level: levels[skill.id] || 0, unlocked: isUnlocked(skill.id, levels), selected: selectedId === skill.id, gaps }, ariaLabel: `${skill.name}, level ${levels[skill.id] || 0}, ${isUnlocked(skill.id, levels) ? 'unlocked' : 'locked'}`, draggable: false })), [levels, selectedId, gaps]);
  const edges: Edge[] = useMemo(() => skills.flatMap(s => s.prerequisites.map(p => ({ id: `${p.id}-${s.id}`, source: p.id, target: s.id, type: 'straight', animated: isUnlocked(s.id, levels) && !reduced, style: { stroke: isUnlocked(s.id, levels) ? branchColors[s.branch] : '#6d6550', strokeWidth: isUnlocked(s.id, levels) ? 1.3 : .8, opacity: isUnlocked(s.id, levels) ? .65 : .28 } }))).concat([{ id: 'bridge-problem', source: 'engineering', target: 'logic', type: 'straight', animated: false, style: { stroke: '#a6b585', strokeWidth: 1, opacity: .17 } }, { id: 'bridge-personal', source: 'engineering', target: 'communication', type: 'straight', animated: false, style: { stroke: '#bd9dcb', strokeWidth: 1, opacity: .17 } }]), [levels, reduced]);
  const select = (skill: Skill, center = false) => { setSelectedId(skill.id); setInspectorOpen(true); setQuery(''); if (center) { setRegion(skill.region); setBranch(skill.branch === 'Core' ? 'All branches' : skill.branch); flow.setCenter(skill.x + 35, skill.y + 35, { zoom: 1.05, duration: reduced ? 0 : 800 }); } };
  const save = () => {
    const next = updateLevel(levels, selectedId, draft);
    if (next === levels || draft === levels[selectedId]) return;
    const newly = skills.filter(s => !isUnlocked(s.id, levels) && isUnlocked(s.id, next));
    setHistory(h => [{ name: selected.name, from: levels[selectedId] || 0, to: draft, at: new Date().toISOString() }, ...h].slice(0, 100));
    setLevels(next); playChime();
    const dramatic = newly.find(s => s.kind === 'legendary') || newly.find(s => s.kind === 'mastery');
    if (dramatic) setCinematic(dramatic); else if (draft > (levels[selectedId] || 0) && selected.kind !== 'normal') setCinematic(selected);
    setNotice(newly.length ? `${selected.name} updated. ${newly.map(s => s.name).join(', ')} unlocked.` : `${selected.name} recorded at level ${draft}.`);
    if (!reduced && flash.current) gsap.fromTo(flash.current, { opacity: .2 }, { opacity: 0, duration: 1.7 });
  };
  const exportProgress = () => { const blob = new Blob([JSON.stringify({ version: 1, levels, history, theme, sample }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'arcana-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Your progress has been exported.'); };
  const importProgress = async (file?: File) => { if (!file) return; try { if (file.size > 1000000) throw new Error(); const data = JSON.parse(await file.text()); if (data.version !== 1 || !data.levels || typeof data.levels !== 'object') throw new Error(); setLevels(normalizeLevels(data.levels)); setHistory(Array.isArray(data.history) ? data.history.filter((e: Entry) => typeof e.name === 'string' && typeof e.at === 'string' && Number.isFinite(e.from) && Number.isFinite(e.to)).slice(0, 100) : []); setSample(false); setNotice('Your atlas has been restored.'); } catch { setNotice('This file is not a valid Arcana progress backup.'); } if (fileInput.current) fileInput.current.value = ''; };
  const results = query.trim() ? skills.filter(s => `${s.name} ${s.branch}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [];

  return <div className={`app theme-${theme}`}>
    <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(v => !v)} aria-label="Open regions"><Menu size={20} /></button><a href="#" className="brand" onClick={e => { e.preventDefault(); setTab('atlas'); navigate('Engineering'); }}><span className="brand-mark">✧</span><span>ARCANA<small>THE SKILL ATLAS</small></span></a>
      <nav className="main-tabs" aria-label="Main navigation">{[['atlas', 'Skill atlas'], ['codex', 'The codex'], ['chronicle', 'Chronicle']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{id === 'atlas' ? <Compass size={15} /> : id === 'codex' ? <BookOpen size={15} /> : <ScrollText size={15} />}{label}</button>)}</nav>
      <div className="header-right"><span className="save-status"><i />{ready ? storageOk ? 'Progress saved locally' : 'Export to save progress' : 'Opening your atlas'}</span><button className="icon-button" aria-label={sound ? 'Mute sound' : 'Enable sound'} onClick={() => { setSound(!sound); setNotice(sound ? 'Sound disabled.' : 'Unlock sounds enabled.'); }}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><button className="icon-button" aria-label="Settings" onClick={() => setModal('settings')}><Settings2 size={17} /></button><div className="avatar"><img src="/art/scholar.webp" alt="Hooded scholar avatar" /></div></div>
    </header>
    <div className="workspace">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="character"><div className="portrait-wrap"><img src="/art/scholar.webp" alt="The hooded Wayfarer" /><span className="portrait-level">{Math.floor(total / 10) + 1}</span></div><span className="eyebrow">YOUR JOURNEY</span><h2>The Wayfarer</h2><p>{sample ? 'Example build · make it your own' : 'A legend in the making'}</p><div className="xp-label"><span>Knowledge acquired</span><span>{total} <small>/ {skills.length * 10}</small></span></div><div className="progress-track"><i style={{ width: `${total / (skills.length * 10) * 100}%` }} /></div></div>
        <div className="sidebar-label">REALMS OF KNOWLEDGE<span>03</span></div><div className="region-list">{regions.map((r, i) => { const Icon = icons[r]; return <div key={r}><button className={`region-button ${region === r ? 'active' : ''}`} onClick={() => { setTab('atlas'); navigate(r); }}><Icon size={18} /><span>{r}<small>{i === 0 ? 'The art of building' : i === 1 ? 'The art of understanding' : 'The art of becoming'}</small></span>{region === r ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>{r === 'Engineering' && region === r && <div className="branch-list">{branches.map((b, j) => <button key={b} className={branch === b ? 'active' : ''} onClick={() => { setTab('atlas'); navigate('Engineering', b); }}><span className="branch-glyph">{['◈', '⬡', '▱', '◇', '✧', '⌘'][j]}</span>{b}<span>{skills.filter(s => s.branch === b && levels[s.id] > 0 && isUnlocked(s.id, levels)).length}/{skills.filter(s => s.branch === b).length}</span></button>)}</div>}</div>; })}</div>
        <div className="sidebar-bottom"><div className="ornament">──── ◇ ────</div><p>“All mastery begins with<br />the courage to learn.”</p><button onClick={() => setModal('help')}><BookOpen size={14} /> A guide to your atlas <ArrowUpRight size={12} /></button><span className="version">ARCANA · V1.0</span></div>
      </aside>
      <main className="main-stage">
        <section className="stage-heading"><div><div className="breadcrumb">THE ATLAS <ChevronRight size={11} /> {region.toUpperCase()}</div><h1>{tab === 'atlas' ? 'Every skill, a new possibility.' : tab === 'codex' ? 'The collected knowledge.' : 'A record of your becoming.'}</h1><p>{tab === 'atlas' ? 'Chart your path. Awaken your potential. Build your legend.' : tab === 'codex' ? 'Discover every discipline and the paths that connect them.' : 'Every step forward leaves its mark on the atlas.'}</p></div><div className="heading-stat"><Sparkles size={16} /><strong>{learned.length}<span> / {skills.length}</span></strong><small>SKILLS AWAKENED</small></div></section>
        <div className="stage-toolbar"><div className="realm-title"><span className="small-diamond">◇</span>{tab === 'atlas' ? region : tab === 'codex' ? 'The codex' : 'Your chronicle'}<span className="toolbar-divider" /><small>{tab === 'atlas' ? branch : `${tab === 'codex' ? skills.length : history.length} entries`}</small></div><div className="toolbar-actions"><button className={`gap-toggle ${gaps ? 'active' : ''}`} onClick={() => { setGaps(!gaps); setNotice(gaps ? 'Showing all skills.' : 'Skill gaps highlighted: sealed or below level 5.'); }}><Crosshair size={14} /><span>Skill gaps</span></button><div className="search-wrap"><Search size={14} /><input aria-label="Find a skill" placeholder="Find a skill…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={12} /></button>}{query && <div className="search-results">{results.length ? results.map(s => <button key={s.id} onClick={() => { setTab('atlas'); select(s, true); }}><Sigil skill={s} size={16} /><span>{s.name}<small>{s.branch}</small></span><span>Lv. {levels[s.id]}</span></button>) : <p>No skills found.</p>}</div>}</div></div></div>
        <div className="atlas-area">
          <div className="world-background" /><Particles />
          {tab === 'atlas' ? <>
            <div className="map-region-label"><span>THE {region === 'Engineering' ? 'ENGINEER’S' : region === 'Problem Solving' ? 'STRATEGIST’S' : 'WAYFARER’S'} CONSTELLATION</span><small>✧ &nbsp; {branch === 'All branches' ? 'All paths are connected' : `The path of ${branch.toLowerCase()}`} &nbsp; ✧</small></div>
            <ReactFlow<SkillNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesConnectable={false} nodesDraggable={false} minZoom={.12} maxZoom={2.5} onNodeClick={(_, node) => select(node.data.skill)} onInit={instance => { setTimeout(() => { instance.fitView({ nodes: skills.filter(s => s.region === region && (branch === 'All branches' || s.branch === branch)).map(s => ({ id: s.id })), padding: .18, maxZoom: 1.25 }); }, 80); }} onMove={(_, vp) => setZoom(Math.round(vp.zoom * 100))} proOptions={{ hideAttribution: true }}>
              <MiniMap position="bottom-right" pannable zoomable nodeColor={node => isUnlocked(node.id, levels) ? branchColors[(node.data as SkillData).skill.branch] : '#3a3935'} maskColor="rgba(9,12,13,.65)" style={{ background: '#111514' }} />
            </ReactFlow>
            <div className="canvas-controls"><button aria-label="Zoom in" onClick={() => flow.zoomIn({ duration: 250 })}><Plus size={16} /></button><span>{zoom}%</span><button aria-label="Zoom out" onClick={() => flow.zoomOut({ duration: 250 })}><Minus size={16} /></button><i /><button aria-label="Fit current region" onClick={() => navigate(region, branch)}><Maximize size={15} /></button><button aria-label="View entire atlas" onClick={() => { setBranch('All branches'); flow.fitView({ duration: reduced ? 0 : 1000, padding: .12 }); }}><Compass size={17} /></button></div>
            <div className="map-hint">DRAG TO EXPLORE <span>·</span> SCROLL TO ZOOM</div>
          </> : tab === 'codex' ? <div className="codex-list">{regions.map(r => <section key={r}><h2>{r}<small>{skills.filter(s => s.region === r).length} disciplines</small></h2><div className="codex-grid">{skills.filter(s => s.region === r).map(s => <button key={s.id} onClick={() => { setTab('atlas'); select(s, true); }}><Sigil skill={s} /><span>{s.name}<small>{s.kind} · {rank(levels[s.id])}</small></span>{isUnlocked(s.id, levels) ? <strong>{levels[s.id]}<small>/10</small></strong> : <LockKeyhole size={16} />}</button>)}</div></section>)}</div> : <div className="chronicle-list">{history.length ? history.map((entry, i) => <div key={`${entry.at}-${i}`}><span className="history-rune">✧</span><div><h3>{entry.name}</h3><p>Level {entry.from} <ChevronRight size={12} /> Level {entry.to}</p></div><time>{new Date(entry.at).toLocaleString()}</time></div>) : <div className="empty-chronicle"><ScrollText size={42} /><h2>Your story is still unwritten.</h2><p>Update a skill level to inscribe your first entry.</p><button className="gold-button" onClick={() => setTab('atlas')}>Return to the atlas <ChevronRight size={14} /></button></div>}</div>}
          <div ref={flash} className="level-flash" />
        </div>
        <footer className="stage-footer"><div className="legend"><span><i className="legend-active" />Awakened</span><span><i className="legend-available" />Available</span><span><i className="legend-locked" />Locked</span><span><i className="legend-mastery" />Mastery</span><span><i className="legend-legendary" />Legendary</span></div><span className="footer-count">{available} unlocked <span>·</span> {mastered.length} mastered</span></footer>
      </main>
      {inspectorOpen && <aside className="inspector"><div className="inspector-top"><span>SKILL INSCRIPTION</span><button className="icon-button" onClick={() => setInspectorOpen(false)} aria-label="Close skill details"><X size={16} /></button></div><div className="inspector-hero"><div className={`detail-sigil ${selected.kind} ${unlocked ? '' : 'sealed'}`} style={{ '--branch': branchColors[selected.branch] } as React.CSSProperties}><span className="detail-orbit" /><Sigil skill={selected} size={48} /></div><span className={`type-badge ${selected.kind}`}>✧ {selected.kind.toUpperCase()} SKILL</span><h2>{selected.name}</h2><p>{selected.region} <ChevronRight size={10} /> {selected.branch}</p></div>
        <div className="inspector-body"><div className="current-level"><span>CURRENT LEVEL</span><strong>{levels[selectedId] || 0}<small> / 10</small></strong><em>{unlocked ? rank(levels[selectedId]) : 'Sealed'}</em></div><div className="level-pips">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < levels[selectedId] && unlocked ? 'filled' : ''} />)}</div><p className="skill-description">{selected.id === 'react' ? 'Weave interfaces from reusable components. Bring ideas to life through state, composition, and the art of declarative thinking.' : selected.description}</p>
        <div className="inspector-section"><h3>PREREQUISITES<span>{selected.prerequisites.length || '—'}</span></h3>{selected.prerequisites.length ? selected.prerequisites.map(p => { const s = skills.find(s => s.id === p.id)!; const met = levels[p.id] >= p.level && isUnlocked(p.id, levels); return <button className="prerequisite" key={p.id} onClick={() => select(s, true)}><Sigil skill={s} size={18} /><span>{s.name}<small>Level {p.level} required</small></span>{met ? <Check className="met" size={15} /> : <span className="requirement-count">{levels[p.id]}/{p.level}</span>}</button>; }) : <p className="quiet-note">A starting path. No prerequisites.</p>}</div>
        <div className="inspector-section level-editor"><h3>INSCRIBE YOUR PROGRESS</h3><p>Mastery is earned. You decide your level.</p><div className="level-stepper"><button aria-label="Decrease skill level" disabled={!unlocked || draft <= 0} onClick={() => setDraft(v => Math.max(0, v - 1))}><Minus size={16} /></button><span><strong>{draft}</strong><small>{rank(draft)}</small></span><button aria-label="Increase skill level" disabled={!unlocked || draft >= 10} onClick={() => setDraft(v => Math.min(10, v + 1))}><Plus size={16} /></button></div><input type="range" aria-label="Skill level" min="0" max="10" value={draft} disabled={!unlocked} onChange={e => setDraft(Number(e.target.value))} /><div className="range-labels"><span>Untrained</span><span>Exceptional mastery</span></div><button className="gold-button" onClick={save} disabled={!unlocked || draft === levels[selectedId]}>{unlocked ? <Sparkles size={15} /> : <LockKeyhole size={15} />}{unlocked ? 'Inscribe progress' : 'Prerequisites not met'}</button></div>
        <div className="next-unlock"><Flame size={18} /><div><h4>What lies beyond</h4><p>{skills.filter(s => s.prerequisites.some(p => p.id === selectedId)).map(s => s.name).join(' · ') || 'The pursuit of exceptional mastery.'}</p></div></div></div><div className="inspector-foot">◇ &nbsp; YOUR POTENTIAL HAS NO CEILING &nbsp; ◇</div></aside>}
    </div>
    <AnimatePresence>{notice && <motion.div role="status" className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={16} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></motion.div>}</AnimatePresence>
    <AnimatePresence>{cinematic && <motion.div className="cinematic" role="dialog" aria-label="Skill awakening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCinematic(null)}><motion.div initial={{ scale: reduced ? 1 : .65 }} animate={{ scale: 1 }} transition={{ duration: 1.5 }}><div className="cinematic-rays" /><span className="eyebrow">A NEW CHAPTER IN YOUR LEGEND</span><div className="cinematic-symbol"><Sigil skill={cinematic} size={70} /></div><span className="type-badge">{cinematic.kind.toUpperCase()} AWAKENING</span><h2>{cinematic.name}</h2><p>Knowledge becomes power.</p><button className="gold-button" onClick={() => setCinematic(null)}>Continue your journey <ChevronRight size={16} /></button></motion.div></motion.div>}</AnimatePresence>
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-label={modal === 'settings' ? 'Atlas settings' : 'A guide to your atlas'} onClick={e => e.stopPropagation()}><button className="modal-close icon-button" autoFocus onClick={() => setModal(null)} aria-label="Close dialog"><X size={20} /></button><span className="eyebrow">THE WAYFARER’S COMPANION</span><h2>{modal === 'settings' ? 'Shape your world.' : 'Your journey begins here.'}</h2>{modal === 'settings' ? <><h3>Atmosphere</h3><div className="theme-options">{['obsidian', 'moonstone'].map(t => <button key={t} className={theme === t ? 'active' : ''} onClick={() => setTheme(t)}>{t === 'obsidian' ? '◈ Obsidian & gold' : '◇ Moonstone & silver'}{theme === t && <Check size={14} />}</button>)}</div><h3>Your progress</h3><p>Progress lives in this browser. Keep a backup before changing devices or clearing browser data.</p><div className="backup-actions"><button onClick={exportProgress}><Download size={16} />Export backup</button><button onClick={() => fileInput.current?.click()}><Upload size={16} />Import backup</button></div><input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e => importProgress(e.target.files?.[0])} /><div className="reset-area"><h3>Begin your own legend</h3><p>{sample ? 'You are exploring an example build. Start fresh to track your own skills.' : 'Reset all levels and your chronicle. Export a backup first if you want to keep them.'}</p><button onClick={() => { if (window.confirm('Reset all skill levels and your chronicle? This cannot be undone without a backup.')) { setLevels(normalizeLevels({ engineering: 1, logic: 1, communication: 1 })); setHistory([]); setSample(false); setModal(null); setNotice('A new journey begins. Your starting paths are open.'); } }}><RotateCcw size={14} />Start a fresh journey</button></div></> : <><p>Your atlas maps real-world skills as an interconnected constellation. Drag to explore, scroll or pinch to zoom, and use the realms to travel.</p><h3>Learn. Reflect. Inscribe.</h3><p>Select any awakened node and assign a level from 0–10. Zero means untrained; ten means exceptional mastery. This is your honest self-assessment.</p><h3>Follow the connections.</h3><p>Sealed skills awaken automatically when every prerequisite reaches its required level. Lowering a prerequisite reseals dependent skills, preserving their recorded levels for later.</p><h3>Discover your next path.</h3><p>Mastery nodes carry a diamond; Legendary nodes carry a radiant crest. Turn on Skill gaps to highlight sealed and low-level skills. Your chronicle records each change.</p><button className="gold-button" onClick={() => setModal(null)}>Enter the atlas <ChevronRight size={15} /></button></>}</section></div>}
  </div>;
}
export default function SkillAtlas() { return <ReactFlowProvider><Atlas /></ReactFlowProvider>; }
