'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow, ViewportPortal, type NodeProps, type Node, type Edge } from '@xyflow/react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import CameraControls from './CameraControls';
import Connections from './Connections';
import GoalControl from './GoalControl';
import Sigil from './Sigil';
import Inspector from './Inspector';
import LibraryOverlay, { type Entry } from './LibraryOverlay';
import AtlasModal from './AtlasModal';
import { dependencyPath } from '@/lib/dependencies';
import { goals, goalTargets, normalizeGoal } from '@/lib/goals';
import { recommendSkills } from '@/lib/recommendations';
import boardLabels from '@/lib/board-labels.json';
import { Sparkles, Code2, Brain, LockKeyhole, ChevronRight, ChevronDown, Check, X, Volume2, VolumeX, Settings2, Search, ScrollText, Crosshair, Download, BookOpen, HelpCircle, Layers } from 'lucide-react';
import { skills, skillById, initialLevels, isUnlocked, normalizeLevels, updateLevel, rank, STORAGE_KEY, LEGACY_STORAGE_KEY, type Skill, type Levels } from '@/lib/progression';
import '@xyflow/react/dist/style.css';

type SkillData = { skill: Skill; level: number; unlocked: boolean; selected: boolean; gaps: boolean; goal: boolean; offGoal: boolean; recommended: boolean; pathMember: boolean; pathMuted: boolean; pathMissing: boolean };
type SkillNode = Node<SkillData, 'skill'>;
const levelColor = (level: number) => level >= 10 ? '#ffcd73' : level >= 8 ? '#c5a1ff' : level >= 5 ? '#76b3ff' : level >= 3 ? '#67dcf3' : '#b4c7e6';
const branchColors: Record<string, string> = { Frontend: '#75bdff', Backend: '#e8af72', Databases: '#6fdcce', 'System Design': '#97a9ff', AI: '#c3a0ff', DSA: '#e3bf79', Core: '#e9bc70', DevOps: '#f0be80', Security: '#ee9fba', Testing: '#8bd9b1', Mobile: '#b6b1ff', 'Problem Solving': '#d7b97c', 'Personal Skills': '#c1a4ee' };
const regions = ['Engineering', 'Problem Solving', 'Personal Skills'];
const branches = [...new Set(skills.filter(s => s.region === 'Engineering' && s.branch !== 'Core').map(s => s.branch))];
const icons: Record<string, typeof Code2> = { Engineering: Code2, 'Problem Solving': Brain, 'Personal Skills': Sparkles };
// Edges longer than this cross whole branches; they stay faint unless a skill or path is in focus.
const LONG_EDGE = 1000;
const validEntries = (value: unknown): Entry[] => Array.isArray(value) ? value.filter((e: Entry) => typeof e.name === 'string' && typeof e.at === 'string' && Number.isFinite(e.from) && Number.isFinite(e.to)).map((e: Entry) => ({ name: e.name, from: e.from, to: e.to, at: e.at, ...(e.sample === true && { sample: true }) })).slice(0, 100) : [];
// The example build ships a short, labeled history so the chronicle shows what it records.
const sampleHistory = (): Entry[] => ([['react', 2, 3, 1], ['javascript', 4, 5, 3], ['css', 5, 6, 6], ['html', 6, 7, 9]] as const).map(([id, from, to, days]) => ({ name: skillById.get(id)!.name, from, to, at: new Date(Date.now() - days * 864e5).toISOString(), sample: true }));

const RuneNode = memo(function RuneNode({ data }: NodeProps<SkillNode>) {
  const { skill, level, unlocked, selected, gaps, goal, offGoal, recommended, pathMember, pathMuted, pathMissing } = data;
  // Tooltips mount on demand: 228 always-present tooltips were most of the board's DOM.
  const [hint, setHint] = useState(false);
  return <div onPointerEnter={() => setHint(true)} onFocus={() => setHint(true)} className={`rune-node ${pathMember ? 'path-member' : ''} ${pathMuted ? 'path-muted' : ''} ${pathMissing ? 'path-missing' : ''} ${recommended ? 'recommended' : ''} ${goal ? 'on-goal' : ''} ${offGoal ? 'off-goal' : ''} ${skill.kind} ${unlocked ? level > 0 ? 'awakened' : 'available' : 'locked'} ${selected ? 'chosen' : ''} ${level >= 8 ? 'high-level' : ''} ${gaps && level >= 5 && unlocked ? 'dimmed' : ''}`} style={{ '--branch': levelColor(level), '--power': .15 + level * .045 } as React.CSSProperties}>
    <div className="rune-orbit" /><div className="rune-ring"><div className="rune-inner"><Sigil skill={skill} size={skill.id === 'engineering' ? 38 : 29} /></div></div>
    {skill.kind !== 'normal' && <span className="rune-crown">{skill.kind === 'legendary' ? '✧' : '◆'}</span>}
    <span className="node-level">{unlocked ? `${level} / 10` : <LockKeyhole size={10} />}</span>
    <div className="node-caption">{skill.name}</div>
    {hint && <div className="node-tooltip">{recommended && <small className="next-label">Suggested next step</small>}<strong>{skill.name}</strong><span>{unlocked ? `${rank(level)} · Level ${level}` : 'Locked'}</span>{skill.prerequisites.map(p => <small key={p.id}>{skillById.get(p.id)?.name} · requires Lv. {p.level}</small>)}</div>}
  </div>;
}, (previous, next) => previous.data.skill === next.data.skill && previous.data.level === next.data.level && previous.data.unlocked === next.data.unlocked && previous.data.selected === next.data.selected && previous.data.gaps === next.data.gaps && previous.data.goal === next.data.goal && previous.data.offGoal === next.data.offGoal && previous.data.recommended === next.data.recommended && previous.data.pathMember === next.data.pathMember && previous.data.pathMuted === next.data.pathMuted && previous.data.pathMissing === next.data.pathMissing);
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
  const [tab, setTab] = useState<'atlas' | 'codex' | 'chronicle'>('atlas');
  const [modal, setModal] = useState<'settings' | 'help' | null>(null);
  const [theme, setTheme] = useState('obsidian');
  const [sound, setSound] = useState(false);
  const [gaps, setGaps] = useState(false);
  const [goalId, setGoalId] = useState('');
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const path = useMemo(() => pathTarget ? dependencyPath(pathTarget, levels) : null, [pathTarget, levels]);
  const missingIds = useMemo(() => new Set(path?.gaps.map(item => item.id) || []), [path]);
  const route = goalTargets(goalId);
  const focus = branch === 'All branches' ? region : branch;
  const activeSkills = useMemo(() => skills.filter(s => s.region === region && (branch === 'All branches' || s.branch === branch)), [region, branch]);
  const activeRated = useMemo(() => activeSkills.filter(s => (levels[s.id] || 0) > 0 && isUnlocked(s.id, levels)).length, [activeSkills, levels]);
  const recommendations = useMemo(() => recommendSkills(levels, goalId, 3, { region, branch: branch === 'All branches' ? undefined : branch }), [levels, goalId, region, branch]);
  const recommendedIds = useMemo(() => new Set(recommendations.map(item => item.id)), [recommendations]);
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
  const inspectorBody = useRef<HTMLDivElement>(null);
  const selected = skillById.get(selectedId)!;
  const unlocked = isUnlocked(selectedId, levels);
  const learned = useMemo(() => skills.filter(s => levels[s.id] > 0 && isUnlocked(s.id, levels)), [levels]);
  const boardRef = useRef<HTMLElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  // Prefer a label-readable zoom over fitting every node into a dot field. The
  // inset reserves room above the nodes for branch labels at overview/nav fits.
  const fitSkills = useCallback((list: Skill[], padding: number, duration: number, maxZoom: number, minZoom = 0, topInset = 0) => {
    if (!list.length) return;
    const box = flow.getNodesBounds(list.map(s => s.id));
    const rect = document.querySelector('.atlas-area')?.getBoundingClientRect();
    const fit = rect ? Math.min(rect.width / box.width, rect.height / box.height) * (1 - padding * 2) : 1;
    const zoom = Math.max(minZoom, Math.min(fit, maxZoom));
    if (topInset > 0 || zoom > fit + .001) {
      flow.setCenter(box.x + box.width / 2, box.y + box.height / 2 - topInset / zoom, { zoom, duration });
      return;
    }
    if (zoom >= .3) { flow.fitView({ nodes: list.map(s => ({ id: s.id })), padding, duration, maxZoom }); return; }
    const lift = 70 / zoom;
    flow.fitBounds({ x: box.x, y: box.y - lift, width: box.width, height: box.height + lift }, { padding, duration });
  }, [flow]);
  const fitIds = useCallback((ids: Iterable<string>, padding: number, duration: number, maxZoom: number, minZoom = 0, topInset = 0) => {
    const list = [...ids].map(id => skillById.get(id)).filter((skill): skill is Skill => Boolean(skill));
    fitSkills(list, padding, duration, maxZoom, minZoom, topInset);
  }, [fitSkills]);
  const labelMinZoom = () => window.innerWidth <= 700 ? .5 : .55;
  // Fit the goal's targets in the branch on screen when possible; the full route stays highlighted.
  const goalFocusIds = (goal: typeof goals[number]) => {
    const ids = Object.keys(goal.targets);
    if (branch === 'All branches') return ids;
    const focused = ids.filter(id => skillById.get(id)?.branch === branch);
    return focused.length ? focused : ids;
  };
  const navigate = useCallback((targetRegion: string, targetBranch = 'All branches') => {
    setInspectorOpen(false); setPathTarget(null); setRegion(targetRegion); setBranch(targetBranch); setRealmMenu(false);
    fitSkills(skills.filter(s => s.region === targetRegion && (targetBranch === 'All branches' || s.branch === targetBranch)), .2, reduced ? 0 : 1000, 1.25, labelMinZoom(), 60);
  }, [fitSkills, reduced]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) { const saved = JSON.parse(raw); setLevels(normalizeLevels(saved.levels)); setHistory(validEntries(saved.history)); setSample(saved.sample === true); setGoalId(normalizeGoal(saved.goalId)); if (['obsidian', 'moonstone'].includes(saved.theme)) setTheme(saved.theme); }
      else setHistory(sampleHistory());
    } catch { setNotice('Your save could not be read. The example build is loaded.'); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, levels, history, theme, sample, goalId })); localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { setStorageOk(false); setNotice('Storage unavailable. Export a backup to keep your progress.'); } } }, [levels, ready, history, theme, sample, goalId]);
  useEffect(() => { setDraft(levels[selectedId] || 0); }, [selectedId, levels]);
  useEffect(() => { inspectorBody.current?.scrollTo({ top: 0 }); }, [selectedId]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { if (!cinematic) return; const t = setTimeout(() => setCinematic(null), 3800); return () => clearTimeout(t); }, [cinematic]);
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true); document.querySelector<HTMLInputElement>('[aria-label="Find a skill"]')?.focus(); } if (e.key === 'Escape') { setPathTarget(null); setModal(null); setCinematic(null); setQuery(''); setRealmMenu(false); setInspectorOpen(false); setSearchOpen(false); setTab('atlas'); } }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, []);
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
  const toggleSound = () => { setSound(!sound); setNotice(sound ? 'Sound disabled.' : 'Unlock sounds enabled.'); };
  const nodes: SkillNode[] = useMemo(() => skills.map(skill => ({ id: skill.id, type: 'skill', width: 70, height: 70, position: { x: skill.x, y: skill.y }, data: { skill, level: levels[skill.id] || 0, unlocked: isUnlocked(skill.id, levels), selected: inspectorOpen && selectedId === skill.id, gaps, goal: route.has(skill.id), offGoal: !!goalId && !route.has(skill.id), recommended: recommendedIds.has(skill.id), pathMember: !!path?.ids.has(skill.id), pathMuted: !!path && !path.ids.has(skill.id), pathMissing: missingIds.has(skill.id) || pathTarget === skill.id && !isUnlocked(skill.id, levels) }, ariaLabel: `${skill.name}, level ${levels[skill.id] || 0}, ${isUnlocked(skill.id, levels) ? 'unlocked' : 'locked'}`, draggable: false })), [levels, selectedId, gaps, inspectorOpen, route, goalId, recommendedIds, path, missingIds, pathTarget]);
  const edges: Edge[] = useMemo(() => skills.flatMap(s => s.prerequisites.map(p => {
    const id = `${p.id}-${s.id}`, from = skillById.get(p.id)!;
    const focused = inspectorOpen && (s.id === selectedId || p.id === selectedId);
    const detail = Math.hypot(s.x - from.x, s.y - from.y) > LONG_EDGE ? 'connection-detail connection-long' : 'connection-detail';
    return { id, source: p.id, target: s.id, type: 'straight', animated: false, className: path ? path.edges.has(id) ? 'connection-path' : 'connection-muted' : focused ? 'connection-focus' : route.has(s.id) && route.has(p.id) ? 'connection-goal' : detail, style: { stroke: isUnlocked(s.id, levels) ? levelColor(levels[p.id] || 0) : '#6e7890', strokeWidth: isUnlocked(s.id, levels) ? 1.8 : 1.2, opacity: focused ? .95 : isUnlocked(s.id, levels) ? .4 : .19 } };
  })).concat([{ id: 'bridge-problem', source: 'engineering', target: 'logic', type: 'straight', animated: false, className: path ? 'connection-muted' : 'connection-bridge', style: { stroke: '#a6b585', strokeWidth: 1, opacity: .17 } }, { id: 'bridge-personal', source: 'engineering', target: 'communication', type: 'straight', animated: false, className: path ? 'connection-muted' : 'connection-bridge', style: { stroke: '#bd9dcb', strokeWidth: 1, opacity: .17 } }]), [levels, inspectorOpen, selectedId, route, path]);
  const select = (skill: Skill, center = false, keepPath = false) => {
    if (!keepPath && !path?.ids.has(skill.id)) setPathTarget(isUnlocked(skill.id, levels) ? null : skill.id);
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
  // Fits the path for `target`, computed directly so it works before path state catches up.
  const fitPath = (target = pathTarget) => { if (!target) return; setPathTarget(target); setInspectorOpen(false); fitIds(dependencyPath(target, levels).ids, .22, reduced ? 0 : 700, 1.1, labelMinZoom(), 80); };
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
  const exportProgress = () => { const blob = new Blob([JSON.stringify({ version: 1, levels, history, theme, sample, goalId }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'skillweave-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Your progress has been exported.'); };
  const importProgress = async (file?: File) => { if (!file) return; try { if (file.size > 1000000) throw new Error(); const data = JSON.parse(await file.text()); if (data.version !== 1 || !data.levels || typeof data.levels !== 'object') throw new Error(); setLevels(normalizeLevels(data.levels)); setGoalId(normalizeGoal(data.goalId)); setHistory(validEntries(data.history)); setSample(false); setNotice('Your atlas has been restored.'); } catch { setNotice('This file is not a valid SkillWeave progress backup.'); } if (fileInput.current) fileInput.current.value = ''; };
  const resetJourney = () => { if (window.confirm('Reset all skill levels and your chronicle? This cannot be undone without a backup.')) { setLevels(normalizeLevels({ engineering: 1, logic: 1, communication: 1 })); setHistory([]); setSample(false); setModal(null); setNotice('A new journey begins. Your starting paths are open.'); } };
  const results = useMemo(() => query.trim() ? skills.filter(s => `${s.name} ${s.branch}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [], [query]);

  return <div className={`app theme-${theme}`}>
    <header className="topbar">
      <a href="#" className="brand" aria-label="SkillWeave home" onClick={e => { e.preventDefault(); setTab('atlas'); navigate('Engineering'); }}><img className="brand-logo" src="/brand/skillweave-logo.webp" width={498} height={72} alt="SkillWeave" fetchPriority="high" /><small>Skill atlas</small></a>
      <div className="header-right">
        <span className="progress-summary" title={`${learned.length} of ${skills.length} skills rated`}><span className="progress-dot" />{learned.length}<span>/ {skills.length}<span className="progress-word"> rated</span></span></span>
        {sample && <button className="demo-chip" onClick={() => setModal('settings')} title="Demo data — open settings to start your own">Demo</button>}
        <span className="save-status" title={ready && storageOk ? 'Progress saved in this browser' : 'Export a backup to save your progress'}>{storageOk ? <Check size={14} /> : <Download size={14} />}<span>{ready ? storageOk ? 'Saved' : 'Not saved' : 'Loading'}</span></span>
        <div className="header-tools"><button className={`icon-button ${tab === 'codex' ? 'active' : ''}`} title="Codex — every skill in one list" aria-label="Codex" aria-pressed={tab === 'codex'} onClick={() => { setTab(tab === 'codex' ? 'atlas' : 'codex'); setInspectorOpen(false); }}><BookOpen size={18} /><span className="tool-label">Codex</span></button><button className={`icon-button ${tab === 'chronicle' ? 'active' : ''}`} title="Chronicle — your saved level changes" aria-label="Chronicle" aria-pressed={tab === 'chronicle'} onClick={() => { setTab(tab === 'chronicle' ? 'atlas' : 'chronicle'); setInspectorOpen(false); }}><ScrollText size={18} /><span className="tool-label">Chronicle</span></button><button className="icon-button sound-button" title={sound ? 'Mute sound' : 'Enable sound'} aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound} onClick={toggleSound}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}<span className="tool-label">Sound</span></button><button className="icon-button" title="Settings — theme, backup, and reset" aria-label="Settings" onClick={() => setModal('settings')}><Settings2 size={18} /><span className="tool-label">Settings</span></button></div>
      </div>
    </header>
    <main ref={boardRef} className="atlas-area" aria-label="Interactive skill board" onKeyDown={event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const nodeId = (event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id;
      const skill = nodeId ? skillById.get(nodeId) : undefined;
      if (skill) { event.preventDefault(); select(skill); }
    }}>
      <div className="world-background" /><div className="celestial-orbit" aria-hidden="true" /><Particles />
      <ReactFlow<SkillNode> nodes={nodes} edges={EMPTY_EDGES} nodeTypes={nodeTypes} onlyRenderVisibleElements edgesFocusable={false} elementsSelectable={false} nodesConnectable={false} nodesDraggable={false} minZoom={.025} maxZoom={2.5} onNodeClick={(_, node) => select(node.data.skill)} onPaneClick={() => { setPathTarget(null); setInspectorOpen(false); setRealmMenu(false); }} onInit={instance => { requestAnimationFrame(() => {
        if (window.innerWidth <= 700) { const start = skillById.get('html')!; instance.setCenter(start.x + 170, start.y + 180, { zoom: .65 }); }
        else instance.fitBounds({ x: -3500, y: -2160, width: 1250, height: 1180 }, { padding: .08 });
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
        <ViewportPortal><Connections edges={edges} /><div ref={labelsRef} className="board-labels">{boardLabels.map(([name, x, y]) => <button key={name} className="constellation-label" style={{ left: Number(x) + 35, top: Number(y), '--label-color': branchColors[String(name)] } as React.CSSProperties} onClick={() => navigate(regions.includes(String(name)) ? String(name) : 'Engineering', regions.includes(String(name)) ? 'All branches' : String(name))}>{name}<span>{skills.filter(s => s.branch === name && levels[s.id] > 0 && isUnlocked(s.id, levels)).length} / {skills.filter(s => s.branch === name).length} rated</span><small>{skills.filter(s => s.branch === name && !levels[s.id] && isUnlocked(s.id, levels)).length} ready to start</small></button>)}<button className="world-label" style={{ left: 35, top: -100 }} onClick={() => navigate('Engineering', 'Frontend')}>Engineering<span>Explore 10 branches</span></button></div></ViewportPortal>
      </ReactFlow>
      <div className="board-navigation">
        <button className={`realm-trigger ${realmMenu ? 'active' : ''}`} aria-label="Choose realm or branch" aria-expanded={realmMenu} onClick={() => setRealmMenu(!realmMenu)}><Layers size={17} /><span>{region}<small>{branch === 'All branches' ? 'All branches' : branch} · {activeRated}/{activeSkills.length} rated</small></span><ChevronDown size={15} /></button>
        {realmMenu && <div className="realm-menu"><span className="menu-label">Jump to a realm</span>{regions.map(r => { const Icon = icons[r]; return <button key={r} className={region === r ? 'active' : ''} onClick={() => { setTab('atlas'); navigate(r); }}><Icon size={17} /><span>{r}</span>{region === r && <Check size={14} />}</button>; })}<div className="branch-shortcuts"><span className="menu-label">Engineering branches</span>{branches.map(b => <button key={b} onClick={() => { setTab('atlas'); navigate('Engineering', b); }}><i style={{ background: branchColors[b] }} />{b}</button>)}</div></div>}
        {sample && <div className="sample-banner"><div><strong>Example profile</strong><span>These levels are demo data. Progress saves only in this browser.</span></div><button onClick={() => setModal('settings')}>Rate my own skills</button></div>}
      </div>
      <div className={`board-search ${searchOpen ? 'expanded' : ''}`}><button className={`icon-button gap-toggle ${gaps ? 'active' : ''}`} title="Highlight skill gaps" aria-label="Skill gaps" aria-pressed={gaps} onClick={() => { setGaps(!gaps); setNotice(gaps ? 'Showing all skills.' : 'Highlighting locked skills and skills below level 5.'); }}><Crosshair size={18} /></button><div className="search-wrap"><button className="search-toggle" aria-label="Open skill search" onClick={() => setSearchOpen(!searchOpen)}><Search size={18} /></button><input aria-label="Find a skill" placeholder="Find a skill…" value={query} onFocus={() => setSearchOpen(true)} onChange={e => setQuery(e.target.value)} />{query ? <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button> : <kbd>/</kbd>}{query && <div className="search-results">{results.length ? results.map(s => <button key={s.id} onClick={() => { setTab('atlas'); select(s, true); setSearchOpen(false); }}><Sigil skill={s} size={20} /><span>{s.name}<small>{s.branch}</small></span><span>{levels[s.id]}/10</span></button>) : <p>No skills found.</p>}</div>}</div></div>
      <GoalControl goalId={goalId} levels={levels} focus={focus} recommendations={recommendations} onSelect={id => { setTab('atlas'); select(skillById.get(id)!, true); }} onChange={id => { setGoalId(id); setPathTarget(null); setInspectorOpen(false); const goal = goals.find(item => item.id === id); if (goal) fitIds(goalFocusIds(goal), .16, reduced ? 0 : 700, 1.2, labelMinZoom(), 80); }} onFit={() => { setPathTarget(null); setInspectorOpen(false); const goal = goals.find(item => item.id === goalId); if (goal) fitIds(goalFocusIds(goal), .16, reduced ? 0 : 700, 1.2, labelMinZoom(), 80); }} />
      <CameraControls onFit={() => navigate(region, branch)} onOverview={() => { setPathTarget(null); setInspectorOpen(false); setBranch('All branches'); fitSkills(skills, .12, reduced ? 0 : 700, 2.5, 0, 90); }} />
      <div className="overview-hint">Whole atlas · choose a branch to read skills</div>
      {path && <div className="path-chip"><button onClick={() => fitPath()} aria-label="Fit prerequisite path">Path to {skillById.get(path.target)!.name}<small>{path.gaps.length ? `${path.gaps.length} ${path.gaps.length === 1 ? 'gap' : 'gaps'} · ${path.gaps.slice(0, 2).map(gap => skillById.get(gap.id)?.name).filter(Boolean).join(', ')}${path.gaps.length > 2 ? '…' : ''}` : 'Requirements met'}</small></button><button className="icon-button" aria-label="Clear prerequisite path" onClick={() => setPathTarget(null)}><X size={14}/></button></div>}
      <div className="board-key"><span><i className="key-learned" />Learned</span><span><i className="key-open" />Available</span><span><LockKeyhole size={11} />Locked</span><button className="icon-button" title="Board guide" aria-label="Board guide" onClick={() => setModal('help')}><HelpCircle size={17} /></button></div>
      <div ref={flash} className="level-flash" />
      {inspectorOpen && tab === 'atlas' && <Inspector skill={selected} levels={levels} unlocked={unlocked} draft={draft} onDraft={setDraft} onSave={save} onClose={() => { setInspectorOpen(false); setPathTarget(null); }} color={branchColors[selected.branch]} goalTarget={route.get(selectedId)} path={path} bodyRef={inspectorBody} onTrace={() => setPathTarget(selectedId)} onShowPath={() => fitPath(pathTarget ?? selectedId)} onClearPath={() => setPathTarget(null)} onSelect={id => select(skillById.get(id)!, true, true)} />}
      {tab !== 'atlas' && <LibraryOverlay tab={tab} levels={levels} history={history} onClose={() => setTab('atlas')} onSelect={id => { setTab('atlas'); select(skillById.get(id)!, true); }} />}
    </main>
    <>{notice && <div role="status" className="toast"><Check size={16} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}</>
    <>{cinematic && <div className="cinematic" role="dialog" aria-label="Skill awakening" onClick={() => setCinematic(null)}><div className="cinematic-content"><div className="cinematic-rays" /><span className="eyebrow">A new path opens</span><div className="cinematic-symbol"><Sigil skill={cinematic} size={70} /></div><span className="type-badge">{cinematic.kind.toUpperCase()} AWAKENING</span><h2>{cinematic.name}</h2><p>Knowledge becomes power.</p><button className="gold-button" onClick={() => setCinematic(null)}>Continue your journey <ChevronRight size={16} /></button></div></div>}</>
    <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e => importProgress(e.target.files?.[0])} />
    {modal && <AtlasModal modal={modal} modalRef={modalRef} onClose={() => setModal(null)} theme={theme} onTheme={setTheme} sound={sound} onSound={toggleSound} sample={sample} onExport={exportProgress} onImport={() => fileInput.current?.click()} onReset={resetJourney} />}
  </div>;
}
export default function SkillAtlas() { return <ReactFlowProvider><Atlas /></ReactFlowProvider>; }
