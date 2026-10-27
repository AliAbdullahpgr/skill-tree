'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow, ViewportPortal, type NodeProps, type Node, type Edge } from '@xyflow/react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import CameraControls from './CameraControls';
import Connections from './Connections';
import GoalControl from './GoalControl';
import { goalTargets, normalizeGoal } from '@/lib/goals';
import boardLabels from '@/lib/board-labels.json';
import { Sparkles, Compass, Code2, Network, Brain, Gem, LockKeyhole, ChevronRight, ChevronDown, Check, X, Plus, Minus, Maximize, Volume2, VolumeX, Settings2, Search, ScrollText, Crosshair, Download, Upload, RotateCcw, Shield, Flame, BookOpen, HelpCircle, Map, Layers } from 'lucide-react';
import { skills, skillById, initialLevels, isUnlocked, normalizeLevels, updateLevel, rank, STORAGE_KEY, type Skill, type Levels } from '@/lib/progression';
import '@xyflow/react/dist/style.css';

type SkillData = { skill: Skill; level: number; unlocked: boolean; selected: boolean; gaps: boolean; goal: boolean; offGoal: boolean };
type SkillNode = Node<SkillData, 'skill'>;
type Entry = { name: string; from: number; to: number; at: string };
const levelColor = (level: number) => level >= 10 ? '#ffcd73' : level >= 8 ? '#c5a1ff' : level >= 5 ? '#76b3ff' : level >= 3 ? '#67dcf3' : '#b4c7e6';
const branchColors: Record<string, string> = { Frontend: '#75bdff', Backend: '#e8af72', Databases: '#6fdcce', 'System Design': '#97a9ff', AI: '#c3a0ff', DSA: '#e3bf79', Core: '#e9bc70', DevOps: '#f0be80', Security: '#ee9fba', Testing: '#8bd9b1', Mobile: '#b6b1ff', 'Problem Solving': '#d7b97c', 'Personal Skills': '#c1a4ee' };
const regions = ['Engineering', 'Problem Solving', 'Personal Skills'];
const branches = [...new Set(skills.filter(s => s.region === 'Engineering' && s.branch !== 'Core').map(s => s.branch))];
const icons: Record<string, typeof Code2> = { Engineering: Code2, 'Problem Solving': Brain, 'Personal Skills': Sparkles };
function Sigil({ skill, size = 24 }: { skill: Skill; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (skill.icon && !failed) return <img alt="" width={size} height={size} decoding="async" src={`/icons/${skill.icon}.svg`} onError={() => setFailed(true)} draggable={false} />;
  const Icon = skill.id === 'engineering' ? Compass : skill.kind === 'legendary' ? Gem : skill.branch === 'AI' ? Brain : skill.branch === 'DSA' ? Network : skill.branch === 'System Design' ? Shield : skill.branch === 'Databases' ? Network : Code2;
  return <Icon size={size} strokeWidth={1.3} />;
}
const RuneNode = memo(function RuneNode({ data }: NodeProps<SkillNode>) {
  const { skill, level, unlocked, selected, gaps, goal, offGoal } = data;
  return <div className={`rune-node ${goal ? 'on-goal' : ''} ${offGoal ? 'off-goal' : ''} ${skill.kind} ${unlocked ? level > 0 ? 'awakened' : 'available' : 'locked'} ${selected ? 'chosen' : ''} ${level >= 8 ? 'high-level' : ''} ${gaps && level >= 5 && unlocked ? 'dimmed' : ''}`} style={{ '--branch': levelColor(level), '--power': .15 + level * .045 } as React.CSSProperties}>
    <div className="rune-orbit" /><div className="rune-ring"><div className="rune-inner"><Sigil skill={skill} size={skill.id === 'engineering' ? 38 : 29} /></div></div>
    {skill.kind !== 'normal' && <span className="rune-crown">{skill.kind === 'legendary' ? '✧' : '◆'}</span>}
    <span className="node-level">{unlocked ? `${level} / 10` : <LockKeyhole size={10} />}</span>
    <div className="node-caption">{skill.name}</div>
    <div className="node-tooltip"><strong>{skill.name}</strong><span>{unlocked ? `${rank(level)} · Level ${level}` : 'Sealed knowledge'}</span>{skill.prerequisites.map(p => <small key={p.id}>{skillById.get(p.id)?.name} · requires Lv. {p.level}</small>)}</div>
  </div>;
}, (previous, next) => previous.data.skill === next.data.skill && previous.data.level === next.data.level && previous.data.unlocked === next.data.unlocked && previous.data.selected === next.data.selected && previous.data.gaps === next.data.gaps && previous.data.goal === next.data.goal && previous.data.offGoal === next.data.offGoal);
const nodeTypes = { skill: RuneNode };
const EMPTY_EDGES: Edge[] = [];

const Particles = memo(function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    // Paint once on resize. CSS moves the bitmap on the compositor, so ambient
    // effects no longer wake JavaScript or repaint the full board every frame.
    const motes = Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() + .3 }));
    const draw = () => {
      canvas.width = Math.min(1280, canvas.clientWidth);
      canvas.height = Math.min(800, canvas.clientHeight);
      ctx.fillStyle = 'rgba(168,192,241,.22)';
      for (const p of motes) {
        ctx.beginPath(); ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    const observer = new ResizeObserver(draw); observer.observe(canvas);
    return () => observer.disconnect();
  }, [reduced]);
  return <canvas ref={ref} className="particles" aria-hidden="true" />;
});

function Atlas() {
  const flow = useReactFlow<SkillNode>();
  const reduced = useReducedMotion();
  const [levels, setLevels] = useState<Levels>(initialLevels);
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('react');
  const [region, setRegion] = useState('Engineering');
  const [branch, setBranch] = useState('Frontend');
  const [draft, setDraft] = useState(3);
  const [tab, setTab] = useState('atlas');
  const [modal, setModal] = useState<'settings' | 'help' | null>(null);
  const [theme, setTheme] = useState('obsidian');
  const [sound, setSound] = useState(false);
  const [gaps, setGaps] = useState(false);
  const [goalId, setGoalId] = useState('');
  const route = goalTargets(goalId);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<Entry[]>([]);
  const [notice, setNotice] = useState('');
  const [cinematic, setCinematic] = useState<Skill | null>(null);
  const [realmMenu, setRealmMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sample, setSample] = useState(true);
  const flash = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = skillById.get(selectedId)!;
  const unlocked = isUnlocked(selectedId, levels);
  const learned = useMemo(() => skills.filter(s => levels[s.id] > 0 && isUnlocked(s.id, levels)), [levels]);
  const boardRef = useRef<HTMLElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const navigate = useCallback((targetRegion: string, targetBranch = 'All branches') => {
    setInspectorOpen(false); setRegion(targetRegion); setBranch(targetBranch); setRealmMenu(false);
    const ids = skills.filter(s => s.region === targetRegion && (targetBranch === 'All branches' || s.branch === targetBranch)).map(s => ({ id: s.id }));
    flow.fitView({ nodes: ids, padding: .2, duration: reduced ? 0 : 1000, maxZoom: 1.25 });
  }, [flow, reduced]);
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const saved = JSON.parse(raw); setLevels(normalizeLevels(saved.levels)); setHistory(Array.isArray(saved.history) ? saved.history.filter((e: Entry) => typeof e.name === 'string' && typeof e.at === 'string' && Number.isFinite(e.from) && Number.isFinite(e.to)).slice(0, 100) : []); setSample(saved.sample === true); setGoalId(normalizeGoal(saved.goalId)); if (['obsidian', 'moonstone'].includes(saved.theme)) setTheme(saved.theme); } } catch { setNotice('Your save could not be read. The example build is loaded.'); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, levels, history, theme, sample, goalId })); } catch { setStorageOk(false); setNotice('Storage unavailable. Export a backup to keep your progress.'); } } }, [levels, ready, history, theme, sample, goalId]);
  useEffect(() => { setDraft(levels[selectedId] || 0); }, [selectedId, levels]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { if (!cinematic) return; const t = setTimeout(() => setCinematic(null), 3800); return () => clearTimeout(t); }, [cinematic]);
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true); document.querySelector<HTMLInputElement>('[aria-label="Find a skill"]')?.focus(); } if (e.key === 'Escape') { setModal(null); setCinematic(null); setQuery(''); setRealmMenu(false); setInspectorOpen(false); setSearchOpen(false); setTab('atlas'); } }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, []);
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
  const nodes: SkillNode[] = useMemo(() => skills.map(skill => ({ id: skill.id, type: 'skill', width: 70, height: 70, position: { x: skill.x, y: skill.y }, data: { skill, level: levels[skill.id] || 0, unlocked: isUnlocked(skill.id, levels), selected: inspectorOpen && selectedId === skill.id, gaps, goal: route.has(skill.id), offGoal: !!goalId && !route.has(skill.id) }, ariaLabel: `${skill.name}, level ${levels[skill.id] || 0}, ${isUnlocked(skill.id, levels) ? 'unlocked' : 'locked'}`, draggable: false })), [levels, selectedId, gaps, inspectorOpen, route, goalId]);
  const edges: Edge[] = useMemo(() => skills.flatMap(s => s.prerequisites.map(p => ({ id: `${p.id}-${s.id}`, source: p.id, target: s.id, type: 'straight', animated: false, className: inspectorOpen && (s.id === selectedId || p.id === selectedId) ? 'connection-focus' : route.has(s.id) && route.has(p.id) ? 'connection-goal' : 'connection-detail', style: { stroke: isUnlocked(s.id, levels) ? levelColor(levels[p.id] || 0) : '#6e7890', strokeWidth: isUnlocked(s.id, levels) ? 1.8 : 1.2, opacity: inspectorOpen && (s.id === selectedId || p.id === selectedId) ? .95 : isUnlocked(s.id, levels) ? .4 : .19 } }))).concat([{ id: 'bridge-problem', source: 'engineering', target: 'logic', type: 'straight', animated: false, className: 'connection-bridge', style: { stroke: '#a6b585', strokeWidth: 1, opacity: .17 } }, { id: 'bridge-personal', source: 'engineering', target: 'communication', type: 'straight', animated: false, className: 'connection-bridge', style: { stroke: '#bd9dcb', strokeWidth: 1, opacity: .17 } }]), [levels, inspectorOpen, selectedId, route]);
  const select = (skill: Skill, center = false) => {
    setSelectedId(skill.id); setInspectorOpen(true); setQuery(''); setRealmMenu(false);
    const mobile = window.innerWidth <= 700;
    const screen = flow.flowToScreenPosition({ x: skill.x + 35, y: skill.y + 35 });
    const covered = mobile || screen.x > window.innerWidth - 390;
    if (center || covered) {
      setRegion(skill.region);
      if (center) setBranch(skill.branch === 'Core' ? 'All branches' : skill.branch);
      const z = center ? .95 : flow.getZoom();
      flow.setCenter(skill.x + 35 + (mobile ? 0 : 140 / z), skill.y + 35 + (mobile ? window.innerHeight * .28 / z : 0), { zoom: z, duration: reduced ? 0 : 700 });
    }
  };
  const save = () => {
    const next = updateLevel(levels, selectedId, draft);
    if (next === levels || draft === levels[selectedId]) return;
    const newly = skills.filter(s => !isUnlocked(s.id, levels) && isUnlocked(s.id, next));
    setHistory(h => [{ name: selected.name, from: levels[selectedId] || 0, to: draft, at: new Date().toISOString() }, ...h].slice(0, 100));
    setLevels(next); playChime();
    const dramatic = newly.find(s => s.kind === 'legendary') || newly.find(s => s.kind === 'mastery');
    if (dramatic) setCinematic(dramatic); else if (draft > (levels[selectedId] || 0) && selected.kind !== 'normal') setCinematic(selected);
    setNotice(newly.length ? `${selected.name} updated. ${newly.map(s => s.name).join(', ')} unlocked.` : `${selected.name} recorded at level ${draft}.`);
    if (!reduced) flash.current?.animate([{ opacity: .16 }, { opacity: 0 }], { duration: 1200 });
  };
  const exportProgress = () => { const blob = new Blob([JSON.stringify({ version: 1, levels, history, theme, sample, goalId }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'arcana-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Your progress has been exported.'); };
  const importProgress = async (file?: File) => { if (!file) return; try { if (file.size > 1000000) throw new Error(); const data = JSON.parse(await file.text()); if (data.version !== 1 || !data.levels || typeof data.levels !== 'object') throw new Error(); setLevels(normalizeLevels(data.levels)); setGoalId(normalizeGoal(data.goalId)); setHistory(Array.isArray(data.history) ? data.history.filter((e: Entry) => typeof e.name === 'string' && typeof e.at === 'string' && Number.isFinite(e.from) && Number.isFinite(e.to)).slice(0, 100) : []); setSample(false); setNotice('Your atlas has been restored.'); } catch { setNotice('This file is not a valid Arcana progress backup.'); } if (fileInput.current) fileInput.current.value = ''; };
  const results = useMemo(() => query.trim() ? skills.filter(s => `${s.name} ${s.branch}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [], [query]);

  return <div className={`app theme-${theme}`}>
    <header className="topbar">
      <a href="#" className="brand" aria-label="Arcana home" onClick={e => { e.preventDefault(); setTab('atlas'); navigate('Engineering'); }}><Compass size={24} strokeWidth={1.2} /><span>Arcana</span><small>Skill atlas</small></a>
      <div className="header-right">
        <span className="progress-summary"><span className="progress-dot" />{learned.length}<span>/ {skills.length} learned</span></span>
        <span className="save-status" title={ready && storageOk ? 'Progress saved in this browser' : 'Export a backup to save your progress'}>{storageOk ? <Check size={14} /> : <Download size={14} />}<span>{ready ? storageOk ? 'Saved' : 'Not saved' : 'Loading'}</span></span>
        <div className="header-tools"><button className={`icon-button ${tab === 'codex' ? 'active' : ''}`} title="The codex" aria-label="The codex" onClick={() => { setTab(tab === 'codex' ? 'atlas' : 'codex'); setInspectorOpen(false); }}><BookOpen size={18} /></button><button className={`icon-button ${tab === 'chronicle' ? 'active' : ''}`} title="Chronicle" aria-label="Chronicle" onClick={() => { setTab(tab === 'chronicle' ? 'atlas' : 'chronicle'); setInspectorOpen(false); }}><ScrollText size={18} /></button><button className="icon-button sound-button" title={sound ? 'Mute sound' : 'Enable sound'} aria-label={sound ? 'Mute sound' : 'Enable sound'} onClick={() => { setSound(!sound); setNotice(sound ? 'Sound disabled.' : 'Unlock sounds enabled.'); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-button" title="Settings" aria-label="Settings" onClick={() => setModal('settings')}><Settings2 size={18} /></button></div>
      </div>
    </header>
    <main ref={boardRef} className="atlas-area" aria-label="Interactive skill board" onKeyDown={event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const nodeId = (event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id;
      const skill = nodeId ? skillById.get(nodeId) : undefined;
      if (skill) { event.preventDefault(); select(skill); }
    }}>
      <div className="world-background" /><div className="celestial-orbit" aria-hidden="true" /><Particles />
      <ReactFlow<SkillNode> nodes={nodes} edges={EMPTY_EDGES} nodeTypes={nodeTypes} onlyRenderVisibleElements edgesFocusable={false} elementsSelectable={false} nodesConnectable={false} nodesDraggable={false} minZoom={.025} maxZoom={2.5} onNodeClick={(_, node) => select(node.data.skill)} onPaneClick={() => { setInspectorOpen(false); setRealmMenu(false); }} onInit={instance => { requestAnimationFrame(() => {
        if (window.innerWidth <= 700) { const start = skillById.get('html')!; instance.setCenter(start.x + 170, start.y + 180, { zoom: .65 }); }
        else instance.fitBounds({ x: -3500, y: -2160, width: 1250, height: 1180 }, { padding: .04 });
      }); }} onMoveStart={() => { if (boardRef.current) boardRef.current.dataset.moving = 'true'; }} onMove={(_, viewport) => {
        const board = boardRef.current; if (!board) return;
        const overview = String(viewport.zoom < .3);
        const detail = viewport.zoom < .07 ? 'world' : viewport.zoom < .3 ? 'overview' : viewport.zoom < .52 ? 'region' : 'detail';
        if (board.dataset.detail !== detail) board.dataset.detail = detail;
        if (board.dataset.overview !== overview) board.dataset.overview = overview;
        const scale = (1 / viewport.zoom).toFixed(2);
        const labels = labelsRef.current;
        if (overview === 'true' && labels && labels.style.getPropertyValue('--overview-scale') !== scale) labels.style.setProperty('--overview-scale', scale);
      }} onMoveEnd={() => { if (boardRef.current) boardRef.current.dataset.moving = 'false'; }} proOptions={{ hideAttribution: true }}>
        <ViewportPortal><Connections edges={edges} /><div ref={labelsRef} className="board-labels">{boardLabels.map(([name, x, y]) => <button key={name} className="constellation-label" style={{ left: Number(x) + 35, top: Number(y), '--label-color': branchColors[String(name)] } as React.CSSProperties} onClick={() => navigate(regions.includes(String(name)) ? String(name) : 'Engineering', regions.includes(String(name)) ? 'All branches' : String(name))}>{name}<span>{skills.filter(s => s.branch === name && levels[s.id] > 0 && isUnlocked(s.id, levels)).length} / {skills.filter(s => s.branch === name).length} learned</span><small>{skills.filter(s => s.branch === name && !levels[s.id] && isUnlocked(s.id, levels)).length} available</small></button>)}<button className="world-label" style={{ left: 35, top: -100 }} onClick={() => navigate('Engineering')}>Engineering<span>10 branches · 214 skills</span></button></div></ViewportPortal>
      </ReactFlow>
      <div className="board-navigation">
        <button className={`realm-trigger ${realmMenu ? 'active' : ''}`} aria-label="Choose realm or branch" aria-expanded={realmMenu} onClick={() => setRealmMenu(!realmMenu)}><Layers size={17} /><span>{region}<small>{branch === 'All branches' ? 'All branches' : branch}</small></span><ChevronDown size={15} /></button>
        {realmMenu && <div className="realm-menu"><span className="menu-label">Jump to a realm</span>{regions.map(r => { const Icon = icons[r]; return <button key={r} className={region === r ? 'active' : ''} onClick={() => { setTab('atlas'); navigate(r); }}><Icon size={17} /><span>{r}</span>{region === r && <Check size={14} />}</button>; })}<div className="branch-shortcuts"><span className="menu-label">Engineering branches</span>{branches.map(b => <button key={b} onClick={() => { setTab('atlas'); navigate('Engineering', b); }}><i style={{ background: branchColors[b] }} />{b}</button>)}</div></div>}
        {sample && <button className="sample-note" onClick={() => setModal('settings')}>Example build <span>Start your own</span></button>}
      </div>
      <div className={`board-search ${searchOpen ? 'expanded' : ''}`}><button className={`icon-button gap-toggle ${gaps ? 'active' : ''}`} title="Highlight skill gaps" aria-label="Skill gaps" aria-pressed={gaps} onClick={() => { setGaps(!gaps); setNotice(gaps ? 'Showing all skills.' : 'Highlighting locked skills and skills below level 5.'); }}><Crosshair size={18} /></button><div className="search-wrap"><button className="search-toggle" aria-label="Open skill search" onClick={() => setSearchOpen(!searchOpen)}><Search size={18} /></button><input aria-label="Find a skill" placeholder="Find a skill…" value={query} onFocus={() => setSearchOpen(true)} onChange={e => setQuery(e.target.value)} />{query ? <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button> : <kbd>/</kbd>}{query && <div className="search-results">{results.length ? results.map(s => <button key={s.id} onClick={() => { setTab('atlas'); select(s, true); setSearchOpen(false); }}><Sigil skill={s} size={20} /><span>{s.name}<small>{s.branch}</small></span><span>{levels[s.id]}/10</span></button>) : <p>No skills found.</p>}</div>}</div></div>
      <GoalControl goalId={goalId} levels={levels} onChange={id => { setGoalId(id); setInspectorOpen(false); if (id) flow.fitView({ nodes: [...goalTargets(id).keys()].map(id => ({ id })), padding: .18, duration: reduced ? 0 : 700 }); }} onFit={() => flow.fitView({ nodes: [...route.keys()].map(id => ({ id })), padding: .18, duration: reduced ? 0 : 700 })} />
      <CameraControls onFit={() => navigate(region, branch)} onOverview={() => { setInspectorOpen(false); setBranch('All branches'); flow.fitView({ duration: reduced ? 0 : 700, padding: .12 }); }} />
      <div className="board-key"><span><i className="key-learned" />Learned</span><span><i className="key-open" />Available</span><span><LockKeyhole size={11} />Locked</span><button className="icon-button" title="Board guide" aria-label="Board guide" onClick={() => setModal('help')}><HelpCircle size={17} /></button></div>
      <div ref={flash} className="level-flash" />
      {inspectorOpen && tab === 'atlas' && <section className="inspector" aria-label="Skill details"><div className="inspector-top"><span>{selected.branch}</span><button className="icon-button" onClick={() => setInspectorOpen(false)} aria-label="Close skill details"><X size={16} /></button></div><div className="inspector-hero"><div className={`detail-sigil ${selected.kind} ${unlocked ? '' : 'sealed'}`} style={{ '--branch': branchColors[selected.branch] } as React.CSSProperties}><span className="detail-orbit" /><Sigil skill={selected} size={48} /></div><span className={`type-badge ${selected.kind}`}>{selected.kind} skill</span><h2>{selected.name}</h2><p>{selected.region} <ChevronRight size={10} /> {selected.branch}</p></div>
        <div className="inspector-body"><div className="current-level"><span>Current level</span><strong>{levels[selectedId] || 0}<small> / 10</small></strong><em>{unlocked ? rank(levels[selectedId]) : 'Sealed'}</em></div><div className="level-pips">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < levels[selectedId] && unlocked ? 'filled' : ''} />)}</div><p className="skill-description">{selected.id === 'react' ? 'Weave interfaces from reusable components. Build interactive applications with state, hooks, and composition.' : selected.description}</p>
        {route.has(selectedId) && <p className="goal-target">Goal target · Level {route.get(selectedId)} {levels[selectedId] >= route.get(selectedId)! && unlocked ? "✓ Reached" : ""}</p>}<div className="inspector-section level-editor"><h3>Set your level</h3><p>An honest reflection of what you can do.</p><div className="level-stepper"><button aria-label="Decrease skill level" disabled={!unlocked || draft <= 0} onClick={() => setDraft(v => Math.max(0, v - 1))}><Minus size={16} /></button><span><strong>{draft}</strong><small>{rank(draft)}</small></span><button aria-label="Increase skill level" disabled={!unlocked || draft >= 10} onClick={() => setDraft(v => Math.min(10, v + 1))}><Plus size={16} /></button></div><input type="range" aria-label="Skill level" min="0" max="10" value={draft} disabled={!unlocked} onChange={e => setDraft(Number(e.target.value))} /><div className="range-labels"><span>Untrained</span><span>Exceptional mastery</span></div></div>
        <div className="inspector-section"><h3>Requires<span>{selected.prerequisites.length || '—'}</span></h3>{selected.prerequisites.length ? selected.prerequisites.map(p => { const s = skillById.get(p.id)!; const met = levels[p.id] >= p.level && isUnlocked(p.id, levels); return <button className="prerequisite" key={p.id} onClick={() => select(s, true)}><Sigil skill={s} size={18} /><span>{s.name}<small>Level {p.level} required</small></span>{met ? <Check className="met" size={15} /> : <span className="requirement-count">{levels[p.id]}/{p.level}</span>}</button>; }) : <p className="quiet-note">A starting path. No prerequisites.</p>}</div>
        <div className="next-unlock"><Flame size={18} /><div><h4>What lies beyond</h4><p>{skills.filter(s => s.prerequisites.some(p => p.id === selectedId)).map(s => s.name).join(' · ') || 'The pursuit of exceptional mastery.'}</p></div></div></div><div className="inspector-save"><button className="gold-button" onClick={save} disabled={!unlocked || draft === levels[selectedId]}>{unlocked ? <Sparkles size={15} /> : <LockKeyhole size={15} />}{unlocked ? 'Save level' : 'Prerequisites not met'}</button></div></section>}

      {tab !== 'atlas' && <div className="library-overlay"><div className="library-heading"><div><h1>{tab === 'codex' ? 'The codex' : 'Chronicle'}</h1><p>{tab === 'codex' ? 'Every path, at a glance.' : 'Your progress, one skill at a time.'}</p></div><button className="icon-button" aria-label="Return to skill board" onClick={() => setTab('atlas')}><X size={22} /></button></div>{tab === 'codex' ? <div className="codex-list">{regions.map(r => <section key={r}><h2>{r}<small>{skills.filter(s => s.region === r).length} skills</small></h2><div className="codex-grid">{skills.filter(s => s.region === r).map(s => <button key={s.id} onClick={() => { setTab('atlas'); select(s, true); }}><Sigil skill={s} /><span>{s.name}<small>{s.kind} · {rank(levels[s.id])}</small></span>{isUnlocked(s.id, levels) ? <strong>{levels[s.id]}<small>/10</small></strong> : <LockKeyhole size={16} />}</button>)}</div></section>)}</div> : <div className="chronicle-list">{history.length ? history.map((entry, i) => <div key={`${entry.at}-${i}`}><span className="history-rune">✧</span><div><h3>{entry.name}</h3><p>Level {entry.from} <ChevronRight size={12} /> Level {entry.to}</p></div><time>{new Date(entry.at).toLocaleString()}</time></div>) : <div className="empty-chronicle"><ScrollText size={36} /><h2>No changes yet.</h2><p>Choose a skill on the board and save your level to start your chronicle.</p><button className="gold-button" onClick={() => setTab('atlas')}>Back to the board</button></div>}</div>}</div>}
    </main>
    <>{notice && <div role="status" className="toast"><Check size={16} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}</>
    <>{cinematic && <div className="cinematic" role="dialog" aria-label="Skill awakening" onClick={() => setCinematic(null)}><div className="cinematic-content"><div className="cinematic-rays" /><span className="eyebrow">A new path opens</span><div className="cinematic-symbol"><Sigil skill={cinematic} size={70} /></div><span className="type-badge">{cinematic.kind.toUpperCase()} AWAKENING</span><h2>{cinematic.name}</h2><p>Knowledge becomes power.</p><button className="gold-button" onClick={() => setCinematic(null)}>Continue your journey <ChevronRight size={16} /></button></div></div>}</>
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-label={modal === 'settings' ? 'Atlas settings' : 'A guide to your atlas'} onClick={e => e.stopPropagation()}><button className="modal-close icon-button" autoFocus onClick={() => setModal(null)} aria-label="Close dialog"><X size={20} /></button><h2>{modal === 'settings' ? 'Atlas settings' : 'Explore your skill board'}</h2>{modal === 'settings' ? <><h3>Atmosphere</h3><div className="theme-options">{['obsidian', 'moonstone'].map(t => <button key={t} className={theme === t ? 'active' : ''} onClick={() => setTheme(t)}>{t === 'obsidian' ? 'Midnight' : 'Moonstone'}{theme === t && <Check size={14} />}</button>)}</div><h3>Your progress</h3><p>Progress lives in this browser. Keep a backup before changing devices or clearing browser data.</p><div className="backup-actions"><button onClick={exportProgress}><Download size={16} />Export backup</button><button onClick={() => fileInput.current?.click()}><Upload size={16} />Import backup</button></div><input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e => importProgress(e.target.files?.[0])} /><div className="reset-area"><h3>Begin your own legend</h3><p>{sample ? 'You are exploring an example build. Start fresh to track your own skills.' : 'Reset all levels and your chronicle. Export a backup first if you want to keep them.'}</p><button onClick={() => { if (window.confirm('Reset all skill levels and your chronicle? This cannot be undone without a backup.')) { setLevels(normalizeLevels({ engineering: 1, logic: 1, communication: 1 })); setHistory([]); setSample(false); setModal(null); setNotice('A new journey begins. Your starting paths are open.'); } }}><RotateCcw size={14} />Start a fresh journey</button></div></> : <><p>Your atlas maps real-world skills as an interconnected constellation. Drag to explore, scroll or pinch to zoom, and use the realms to travel.</p><h3>Track your skills</h3><p>Select any awakened node and assign a level from 0–10. Zero means untrained; ten means exceptional mastery. This is your honest self-assessment.</p><h3>Unlock the next step</h3><p>Sealed skills awaken automatically when every prerequisite reaches its required level. Lowering a prerequisite reseals dependent skills, preserving their recorded levels for later.</p><h3>Read the board</h3><p>Node colors reflect level: silver for 0–2, cyan for 3–4, blue for 5–7, violet for 8–9, and gold at 10. Mastery nodes carry a diamond; Legendary nodes carry a radiant crest. Turn on Skill gaps to highlight sealed and low-level skills. Your chronicle records each change.</p><button className="gold-button" onClick={() => setModal(null)}>Enter the atlas <ChevronRight size={15} /></button></>}</section></div>}
  </div>;
}
export default function SkillAtlas() { return <ReactFlowProvider><Atlas /></ReactFlowProvider>; }
