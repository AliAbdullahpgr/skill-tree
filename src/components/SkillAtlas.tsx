'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow, ViewportPortal, type NodeProps, type Node, type Edge } from '@xyflow/react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import CameraControls from './CameraControls';
import BoardLegend from './BoardLegend';
import PathControl from './PathControl';
import CaptionBounds from './CaptionBounds';
import Connections from './Connections';
import GoalControl from './GoalControl';
import Sigil from './Sigil';
import Inspector from './Inspector';
import { readProgress } from '@/lib/progress-save';
import { fromLegacyLevel, plural, starCount } from '@/lib/proficiency';
import LibraryOverlay, { type Entry } from './LibraryOverlay';
import AtlasModal from './AtlasModal';
import { dependencyPath, lockReason } from '@/lib/dependencies';
import { goals, goalTargets, goalProgress, normalizeGoal } from '@/lib/goals';
import { recommendSkills } from '@/lib/recommendations';
import boardLabels from '@/lib/board-labels.json';
import { AlertTriangle, Info, Sparkles, Code2, Brain, LockKeyhole, ChevronRight, ChevronDown, Check, X, Volume2, VolumeX, Settings2, Search, ScrollText, Crosshair, Download, BookOpen, Star, Layers } from 'lucide-react';
import { skills, trainableSkills, skillById, initialLevels, isUnlocked, isStructural, raisePrerequisites, normalizeLevels, updateLevel, rank, STORAGE_KEY, LEGACY_STORAGE_KEY, PRE_BRAND_STORAGE_KEY, type Skill, type Levels } from '@/lib/progression';
import '@xyflow/react/dist/style.css';

type SkillData = { skill: Skill; level: number; unlocked: boolean; selected: boolean; gaps: boolean; goal: boolean; offGoal: boolean; offBranch: boolean; recommended: boolean; pathMember: boolean; pathMuted: boolean; pathMissing: boolean };
type SkillNode = Node<SkillData, 'skill'>;
const levelColor = (level: number) => level >= 5 ? '#ffcd73' : level >= 4 ? '#c5a1ff' : level >= 3 ? '#76b3ff' : level >= 2 ? '#67dcf3' : '#b4c7e6';
const branchColors: Record<string, string> = { Frontend: '#75bdff', Backend: '#e8af72', Databases: '#6fdcce', 'System Design': '#97a9ff', AI: '#c3a0ff', DSA: '#e3bf79', Core: '#e9bc70', DevOps: '#f0be80', Security: '#ee9fba', Testing: '#8bd9b1', Mobile: '#b6b1ff', 'Problem Solving': '#d7b97c', 'Personal Skills': '#c1a4ee' };
const regions = ['Engineering', 'Problem Solving', 'Personal Skills'];
const branches = [...new Set(trainableSkills.filter(s => s.region === 'Engineering').map(s => s.branch))];
const icons: Record<string, typeof Code2> = { Engineering: Code2, 'Problem Solving': Brain, 'Personal Skills': Sparkles };
// Edges longer than this cross whole branches; they stay faint unless a skill or path is in focus.
const LONG_EDGE = 1000;
// The example build ships a short, labeled history so the chronicle shows what it records.
const sampleHistory = (): Entry[] => ([['react', 2, 3, 1], ['javascript', 4, 5, 3], ['css', 4, 6, 6], ['html', 6, 7, 9]] as const).map(([id, from, to, days]) => ({ name: skillById.get(id)!.name, from: fromLegacyLevel(from), to: fromLegacyLevel(to), at: new Date(Date.now() - days * 864e5).toISOString(), sample: true }));

const RuneNode = memo(function RuneNode({ data }: NodeProps<SkillNode>) {
  const { skill, level, unlocked, selected, gaps, goal, offGoal, offBranch, recommended, pathMember, pathMuted, pathMissing } = data;
  // Tooltips mount on demand: 228 always-present tooltips were most of the board's DOM.
  const [hint, setHint] = useState(false);
  return <div onPointerEnter={() => setHint(true)} onFocus={() => setHint(true)} className={`rune-node ${pathMember ? 'path-member' : ''} ${pathMuted ? 'path-muted' : ''} ${pathMissing ? 'path-missing' : ''} ${recommended ? 'recommended' : ''} ${goal ? 'on-goal' : ''} ${offGoal ? 'off-goal' : ''} ${offBranch ? 'off-branch' : ''} ${gaps && (!unlocked || level < 3) ? 'gap' : ''} ${skill.kind} ${unlocked ? level > 0 ? 'awakened' : 'available' : 'locked'} ${selected ? 'chosen' : ''} ${level >= 4 ? 'high-level' : ''} ${gaps && level >= 3 && unlocked ? 'dimmed' : ''}`} style={{ '--branch': levelColor(level), '--power': .15 + level * .09 } as React.CSSProperties}>
    <div className="rune-orbit" /><div className="rune-ring"><div className="rune-inner"><Sigil skill={skill} size={skill.id === 'engineering' ? 38 : 29} /></div></div>
    {skill.kind !== 'normal' && <span className="rune-crown">{skill.kind === 'legendary' ? '✧' : '◆'}</span>}
    <span className="node-level">{unlocked ? <><Star size={10} fill="currentColor"/>{level}/5</> : <LockKeyhole size={10} />}</span>
    <div className="node-caption">{skill.name}</div>
    {hint && <div className="node-tooltip">{recommended && <small className="next-label">Suggested next step</small>}<strong>{skill.name}</strong><span>{unlocked ? `${starCount(level)} · ${rank(level)}` : 'Locked'}</span>{skill.prerequisites.filter(p => !isStructural(p.id)).map(p => <small key={p.id}>{skillById.get(p.id)?.name} · needs {starCount(p.level)}</small>)}</div>}
  </div>;
}, (previous, next) => previous.data.skill === next.data.skill && previous.data.level === next.data.level && previous.data.unlocked === next.data.unlocked && previous.data.selected === next.data.selected && previous.data.gaps === next.data.gaps && previous.data.goal === next.data.goal && previous.data.offGoal === next.data.offGoal && previous.data.offBranch === next.data.offBranch && previous.data.recommended === next.data.recommended && previous.data.pathMember === next.data.pathMember && previous.data.pathMuted === next.data.pathMuted && previous.data.pathMissing === next.data.pathMissing);
const nodeTypes = { skill: RuneNode };
// React Flow's default node description mentions moving and deleting nodes, which this board does not allow.
const ariaLabels = { 'node.a11yDescription.default': 'Press Enter or Space to open skill details.', 'node.a11yDescription.keyboardDisabled': 'Press Enter or Space to open skill details.' };
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
  const [tab, setTab] = useState<'atlas' | 'codex' | 'chronicle'>('atlas');
  const [modal, setModal] = useState<'settings' | 'help' | null>(null);
  const [theme, setTheme] = useState('obsidian');
  const [sound, setSound] = useState(false);
  const [gaps, setGaps] = useState(false);
  const [goalId, setGoalId] = useState('');
  // Fading skills outside the goal can be switched off for the session.
  const [goalFade, setGoalFade] = useState(true);
  const [resetFocus, setResetFocus] = useState(false);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const path = useMemo(() => pathTarget ? dependencyPath(pathTarget, levels) : null, [pathTarget, levels]);
  const missingIds = useMemo(() => new Set(path?.gaps.map(item => item.id) || []), [path]);
  const route = goalTargets(goalId);
  const focus = branch === 'All branches' ? region : branch;
  const activeSkills = useMemo(() => trainableSkills.filter(s => s.region === region && (branch === 'All branches' || s.branch === branch)), [region, branch]);
  const activeRated = useMemo(() => activeSkills.filter(s => (levels[s.id] || 0) > 0 && isUnlocked(s.id, levels)).length, [activeSkills, levels]);
  const recommendations = useMemo(() => recommendSkills(levels, goalId, 3, { region, branch: branch === 'All branches' ? undefined : branch }), [levels, goalId, region, branch]);
  const recommendedIds = useMemo(() => new Set(recommendations.map(item => item.id)), [recommendations]);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<Entry[]>([]);
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const notify = useCallback((text: string, tone: 'success' | 'error' | 'info' = 'success') => setNotice({ text, tone }), []);
  const [cinematic, setCinematic] = useState<{ skill: Skill; others: string[] } | null>(null);
  const [realmMenu, setRealmMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [guideRequest, setGuideRequest] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sample, setSample] = useState(true);
  const flash = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inspectorBody = useRef<HTMLDivElement>(null);
  const selected = skillById.get(selectedId)!;
  const unlocked = isUnlocked(selectedId, levels);
  const learned = useMemo(() => trainableSkills.filter(s => levels[s.id] > 0 && isUnlocked(s.id, levels)), [levels]);
  const trainableCount = trainableSkills.length;
  const goalName = goals.find(item => item.id === goalId)?.name;
  const goalOutsideView = !!goalId && goalFade && !activeSkills.some(s => route.has(s.id));
  const boardRef = useRef<HTMLElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  // Prefer a label-readable zoom over fitting every node into a dot field. The
  // inset reserves room above the nodes for branch labels at overview/nav fits.
  // `rightInset` keeps the fit clear of the open skill card on wide screens.
  const fitSkills = useCallback((list: Skill[], padding: number, duration: number, maxZoom: number, minZoom = 0, topInset = 0, rightInset = 0) => {
    list = list.filter(s => !isStructural(s.id));
    if (!list.length) return;
    const box = flow.getNodesBounds(list.map(s => s.id));
    const rect = document.querySelector('.atlas-area .react-flow')?.getBoundingClientRect();
    const width = (rect?.width ?? 1000) - rightInset, height = rect?.height ?? 700;
    const safeTop = width <= 700 ? 160 : 110;
    const safeBottom = width <= 700 ? 60 : 30;
    const fit = Math.min((width - 80) / (box.width + 160), (height - safeTop - safeBottom) / (box.height + 90)) * (1 - padding);
    const zoom = Math.max(minZoom, Math.min(fit, maxZoom));
    flow.setCenter(box.x + box.width / 2 + rightInset / (2 * zoom), box.y + box.height / 2 - (safeTop - safeBottom + topInset) / (2 * zoom), { zoom, duration });
  }, [flow]);
  const fitIds = useCallback((ids: Iterable<string>, padding: number, duration: number, maxZoom: number, minZoom = 0, topInset = 0, rightInset = 0) => {
    const list = [...ids].map(id => skillById.get(id)).filter((skill): skill is Skill => Boolean(skill));
    fitSkills(list, padding, duration, maxZoom, minZoom, topInset, rightInset);
  }, [fitSkills]);
  const labelMinZoom = () => window.innerWidth <= 700 ? .5 : .55;
  // Whole branches fit at a slightly smaller zoom on wide screens; captions stay readable.
  const branchMinZoom = () => window.innerWidth <= 700 ? .5 : .42;
  const cardInset = () => window.innerWidth > 700 ? 420 : 0;
  // Fit the goal's targets in the branch on screen when possible; the full route stays highlighted.
  const focusGoal = (id: string) => {
    const goal = goals.find(item => item.id === id);
    if (!goal) return;
    const targets = Object.keys(goal.targets).map(id => skillById.get(id)!).filter(Boolean);
    const current = targets.filter(skill => skill.branch === branch);
    const mainBranch = targets.reduce<Record<string, number>>((counts, skill) => ({ ...counts, [skill.branch]: (counts[skill.branch] || 0) + 1 }), {});
    const targetBranch = current.length ? branch : Object.keys(mainBranch).sort((a, b) => mainBranch[b] - mainBranch[a])[0];
    const focused = targets.filter(skill => skill.branch === targetBranch);
    setRegion(focused[0].region); setBranch(targetBranch);
    fitSkills(focused, .16, reduced ? 0 : 700, 1.05, branchMinZoom(), 40);
  };
  const navigate = useCallback((targetRegion: string, targetBranch = 'All branches') => {
    setInspectorOpen(false); setPathTarget(null); setRegion(targetRegion); setBranch(targetBranch); setRealmMenu(false);
    const list = trainableSkills.filter(s => s.region === targetRegion && (targetBranch === 'All branches' || s.branch === targetBranch));
    // A realm with several branches opens on its branch cards rather than an unreadable dot field.
    if (targetRegion === 'Engineering' && targetBranch === 'All branches') fitSkills(list, .26, reduced ? 0 : 1000, 2.5, 0, 110);
    else fitSkills(list, .04, reduced ? 0 : 1000, 1.25, branchMinZoom(), 10);
  }, [fitSkills, reduced]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? localStorage.getItem(PRE_BRAND_STORAGE_KEY);
      if (raw) { const saved = readProgress(JSON.parse(raw)); setLevels(saved.levels); setHistory(saved.history); setSample(saved.sample === true); setGoalId(normalizeGoal(saved.goalId)); setSound(saved.sound); if (['obsidian', 'moonstone'].includes(String(saved.theme))) setTheme(String(saved.theme)); }
      else setHistory(sampleHistory());
    } catch { notify('Your save could not be read. The example build is loaded.', 'error'); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ratingScale: 5, levels, history, theme, sample, goalId, sound })); } catch { setStorageOk(false); notify('Storage unavailable. Export a backup to keep your progress.', 'error'); } } }, [levels, ready, history, theme, sample, goalId, sound]);
  useEffect(() => { inspectorBody.current?.scrollTo({ top: 0 }); }, [selectedId]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 6000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Find a skill"]')?.focus()); } if (e.key === 'Escape') { setPathTarget(null); setModal(null); setCinematic(null); setQuery(''); setRealmMenu(false); setInspectorOpen(false); setSearchOpen(false); setTab('atlas'); } }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, []);
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
  const playChime = () => { if (!sound) return; try { const ctx = audio.current || new AudioContext(); audio.current = ctx; void ctx.resume(); [261.63, 392, 523.25, 783.99].forEach((freq, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0, ctx.currentTime + i * .12); g.gain.linearRampToValueAtTime(.055, ctx.currentTime + i * .12 + .03); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .12 + 1.2); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * .12); o.stop(ctx.currentTime + i * .12 + 1.3); }); } catch { notify('Audio is unavailable in this browser.', 'error'); } };
  const toggleSound = () => { setSound(!sound); notify(sound ? 'Sound disabled.' : 'Sound effects enabled.', 'info'); };
  const nodes: SkillNode[] = useMemo(() => trainableSkills.map(skill => ({ id: skill.id, type: 'skill', width: 70, height: 70, position: { x: skill.x, y: skill.y }, data: { skill, level: levels[skill.id] || 0, unlocked: isUnlocked(skill.id, levels), selected: inspectorOpen && selectedId === skill.id, gaps, goal: route.has(skill.id), offGoal: goalFade && !!goalId && !route.has(skill.id), offBranch: branch !== 'All branches' && skill.branch !== branch, recommended: recommendedIds.has(skill.id), pathMember: !!path?.ids.has(skill.id), pathMuted: !!path && !path.ids.has(skill.id), pathMissing: missingIds.has(skill.id) || pathTarget === skill.id && !isUnlocked(skill.id, levels) }, ariaLabel: `${skill.name}, ${starCount(levels[skill.id] || 0)}, ${isUnlocked(skill.id, levels) ? 'unlocked' : 'locked'}`, draggable: false })), [levels, selectedId, gaps, inspectorOpen, route, goalId, goalFade, branch, recommendedIds, path, missingIds, pathTarget]);
  const edges: Edge[] = useMemo(() => trainableSkills.flatMap(s => s.prerequisites.filter(p => !isStructural(p.id)).map(p => {
    const id = `${p.id}-${s.id}`, from = skillById.get(p.id)!;
    const focused = inspectorOpen && (s.id === selectedId || p.id === selectedId);
    const detail = Math.hypot(s.x - from.x, s.y - from.y) > LONG_EDGE ? 'connection-detail connection-long' : 'connection-detail';
    return { id, source: p.id, target: s.id, type: 'straight', animated: false, className: path ? path.edges.has(id) ? 'connection-path' : 'connection-muted' : focused ? 'connection-focus' : route.has(s.id) && route.has(p.id) ? 'connection-goal' : detail, style: { stroke: isUnlocked(s.id, levels) ? levelColor(levels[p.id] || 0) : '#6e7890', strokeWidth: isUnlocked(s.id, levels) ? 1.8 : 1.2, opacity: focused ? .95 : isUnlocked(s.id, levels) ? .4 : .19 } };
  })), [levels, inspectorOpen, selectedId, route, path]);
  const select = (skill: Skill, center = false, keepPath = false) => {
    if (isStructural(skill.id)) return;
    if (!keepPath && !path?.ids.has(skill.id)) setPathTarget(isUnlocked(skill.id, levels) ? null : skill.id);
    setSelectedId(skill.id); setInspectorOpen(true); setGuideRequest(0); setQuery(''); setRealmMenu(false);
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
  // From the skill card the card stays open and the camera shifts left of it; from the path pill the card is closed.
  const fitPath = (target = pathTarget, keepCard = false) => { if (!target) return; const path = dependencyPath(target, levels); const step = path.gaps.find(item => !item.blocked)?.id ?? target; setPathTarget(target); if (!keepCard) setInspectorOpen(false); fitIds([step], .2, reduced ? 0 : 700, .85, labelMinZoom(), 40, keepCard ? cardInset() : 0); };
  const goalTargetIds = useMemo(() => new Set(Object.keys(goals.find(item => item.id === goalId)?.targets ?? {})), [goalId]);
  // Unlocks the user is working toward come first; only those earn the full-screen moment.
  const announceUnlocks = (newly: Skill[], lead: string) => {
    const weight = (s: Skill) => s.id === pathTarget ? 3 : path?.ids.has(s.id) ? 2 : route.has(s.id) ? 1 : 0;
    const ordered = [...newly].sort((a, b) => weight(b) - weight(a));
    const dramatic = ordered.find(s => s.id === pathTarget) ?? ordered.find(s => goalTargetIds.has(s.id) && s.kind !== 'normal');
    if (dramatic) setCinematic({ skill: dramatic, others: ordered.filter(s => s !== dramatic).map(s => s.name) });
    const names = ordered.slice(0, 3).map(s => s.name).join(', ');
    notify(`${lead} Unlocked: ${names}${ordered.length > 3 ? ` and ${ordered.length - 3} more` : ''}.`, 'success');
  };
  const save = (rating: number) => {
    const next = updateLevel(levels, selectedId, rating);
    if (next === levels || next[selectedId] === levels[selectedId]) return;
    const newly = skills.filter(s => !isUnlocked(s.id, levels) && isUnlocked(s.id, next));
    setHistory(h => [{ name: selected.name, from: levels[selectedId] || 0, to: next[selectedId], at: new Date().toISOString() }, ...h].slice(0, 100));
    setLevels(next); playChime();
    if (newly.length) announceUnlocks(newly, `${selected.name} rated ${starCount(next[selectedId])}.`);
    else notify(rating ? `${selected.name} rated ${starCount(next[selectedId])}.` : `${selected.name} rating cleared.`, 'success');
    if (!reduced) flash.current?.animate([{ opacity: .16 }, { opacity: 0 }], { duration: 1200 });
  };
  // "I already know this": set every unmet prerequisite to its minimum, then the skill can be rated.
  const raiseFor = (id: string) => {
    const { levels: next, changes } = raisePrerequisites(levels, id);
    if (!changes.length) return;
    const at = new Date().toISOString();
    setHistory(h => [...changes.map(c => ({ name: skillById.get(c.id)!.name, from: c.from, to: c.to, at })).reverse(), ...h].slice(0, 100));
    setLevels(next); setPathTarget(null);
    notify(`${plural(changes.length, 'prerequisite')} set to the minimum. ${skillById.get(id)!.name} is ready to rate.`, 'success');
  };
  const exportProgress = () => { const blob = new Blob([JSON.stringify({ version: 2, ratingScale: 5, levels, history, theme, sample, goalId, sound }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'skillweave-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Your progress has been exported.', 'success'); };
  const importProgress = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error();
      const data = readProgress(JSON.parse(await file.text()));
      setLevels(data.levels); setHistory(data.history); setGoalId(normalizeGoal(data.goalId)); setSample(data.sample);
      if (['obsidian', 'moonstone'].includes(String(data.theme))) setTheme(String(data.theme));
      notify('Your atlas has been restored.', 'success');
    } catch { notify('Import failed — this file is not a valid SkillWeave progress backup. Nothing was changed.', 'error'); }
    if (fileInput.current) fileInput.current.value = '';
  };
  const resetJourney = () => { setLevels(normalizeLevels({})); setHistory([]); setSample(false); setGoalId(''); setPathTarget(null); setInspectorOpen(false); setTab('atlas'); setModal(null); navigate('Engineering', 'Frontend'); notify('Progress cleared. Your journey begins with the foundation skills.', 'success'); };
  const results = useMemo(() => query.trim() ? trainableSkills.filter(s => `${s.name} ${s.branch}`.toLowerCase().includes(query.trim().toLowerCase())) : [], [query]);

  return <div className={`app theme-${theme} ${tab !== 'atlas' ? 'library-open' : ''} ${inspectorOpen ? 'inspector-open' : ''} ${modal ? 'modal-open' : ''}`}>
    <header className="topbar">
      <a href="#" className="brand" aria-label="SkillWeave home" onClick={e => { e.preventDefault(); setTab('atlas'); navigate('Engineering'); }}><img className="brand-logo" src="/brand/skillweave-logo.webp" width={498} height={72} alt="SkillWeave" fetchPriority="high" /><small>Skill atlas</small></a>
      <div className="header-right">
        <span className="progress-summary" title={`${learned.length} of ${trainableCount} skills rated`}><span className="progress-dot" />{learned.length}<span>/ {trainableCount}<span className="progress-word"> rated</span></span></span>
        {sample && <button className="demo-chip" onClick={() => { setResetFocus(true); setModal('settings'); }} title="You are viewing example ratings. Choose to reset and start your own profile.">Demo data</button>}
        <span className="save-status" title={ready && storageOk ? 'Progress saved in this browser' : 'Export a backup to save your progress'}>{storageOk ? <Check size={14} /> : <Download size={14} />}<span>{ready ? storageOk ? 'Saved locally' : 'Not saved' : 'Loading'}</span></span>
        <div className="header-tools"><button className={`icon-button ${tab === 'codex' ? 'active' : ''}`} title="Skills — every skill in one list" aria-pressed={tab === 'codex'} onClick={() => { setTab(tab === 'codex' ? 'atlas' : 'codex'); setInspectorOpen(false); }}><BookOpen size={18} /><span className="tool-label">Skills</span></button><button className={`icon-button ${tab === 'chronicle' ? 'active' : ''}`} title="History — your saved rating changes" aria-pressed={tab === 'chronicle'} onClick={() => { setTab(tab === 'chronicle' ? 'atlas' : 'chronicle'); setInspectorOpen(false); }}><ScrollText size={18} /><span className="tool-label">History</span></button><button className="icon-button sound-button" title={sound ? 'Mute sound' : 'Enable sound'} aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound} onClick={toggleSound}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}<span className="tool-label">Sound</span></button><button className="icon-button" title="Settings — theme, backup, and reset" onClick={() => { setResetFocus(false); setModal('settings'); }}><Settings2 size={18} /><span className="tool-label">Settings</span></button></div>
      </div>
    </header>
    <main ref={boardRef} className="atlas-area" aria-label="Interactive skill board" onKeyDown={event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const nodeId = (event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id;
      const skill = nodeId ? skillById.get(nodeId) : undefined;
      if (skill) { event.preventDefault(); select(skill); }
    }}>
      <div className="world-background" /><div className="celestial-orbit" aria-hidden="true" /><Particles />
      <ReactFlow<SkillNode> nodes={nodes} edges={EMPTY_EDGES} nodeTypes={nodeTypes} ariaLabelConfig={ariaLabels} onlyRenderVisibleElements edgesFocusable={false} elementsSelectable={false} nodesConnectable={false} nodesDraggable={false} minZoom={.025} maxZoom={2.5} onNodeClick={(_, node) => select(node.data.skill)} onPaneClick={() => { setPathTarget(null); setInspectorOpen(false); setRealmMenu(false); }} onInit={instance => { requestAnimationFrame(() => {
        if (window.innerWidth <= 700) { const start = skillById.get('html')!; instance.setCenter(start.x + 170, start.y + 180, { zoom: .65 }); }
        else fitSkills(trainableSkills.filter(skill => skill.branch === 'Frontend'), .04, 0, .85, branchMinZoom(), 10);
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
        <CaptionBounds/>
        <ViewportPortal><Connections edges={edges} /><div ref={labelsRef} className="board-labels">{boardLabels.map(([name, x, y]) => <button key={name} className="constellation-label" style={{ left: Number(x) + 35, top: Number(y), '--label-color': branchColors[String(name)] } as React.CSSProperties} onClick={() => navigate(regions.includes(String(name)) ? String(name) : 'Engineering', regions.includes(String(name)) ? 'All branches' : String(name))}>{name}<span>{skills.filter(s => s.branch === name && levels[s.id] > 0 && isUnlocked(s.id, levels)).length} / {skills.filter(s => s.branch === name).length} rated</span><small>{skills.filter(s => s.branch === name && !levels[s.id] && isUnlocked(s.id, levels)).length} ready to rate</small></button>)}<button className="world-label" style={{ left: 35, top: -100 }} onClick={() => navigate('Engineering', 'Frontend')}>Engineering<span>Explore 10 branches</span></button></div></ViewportPortal>
      </ReactFlow>
      <div className="board-navigation">
        <button className={`realm-trigger ${realmMenu ? 'active' : ''}`} aria-label="Choose realm or branch" aria-expanded={realmMenu} onClick={() => setRealmMenu(!realmMenu)}><Layers size={17} /><span>{region}<small>{branch === 'All branches' ? 'All branches' : branch} · {activeRated}/{activeSkills.length} rated</small></span><ChevronDown size={15} /></button>
        {realmMenu && <div className="realm-menu"><div className="realm-menu-heading"><span className="menu-label">Choose an area<small>A realm groups related skills</small></span><button className="icon-button" aria-label="Close realm menu" onClick={() => setRealmMenu(false)}><X size={16}/></button></div>{regions.map(r => { const Icon = icons[r]; return <button key={r} className={region === r ? 'active' : ''} onClick={() => { setTab('atlas'); navigate(r); }}><Icon size={17} /><span>{r}</span>{region === r && <Check size={14} />}</button>; })}<div className="branch-shortcuts"><span className="menu-label">Engineering branches</span>{branches.map(b => <button key={b} aria-pressed={region === 'Engineering' && branch === b} onClick={() => { setTab('atlas'); navigate('Engineering', b); }}>{b}{region === 'Engineering' && branch === b && <Check size={13}/>}</button>)}</div></div>}
      </div>
      <div className={`board-search ${searchOpen ? 'expanded' : ''}`}><button className={`icon-button gap-toggle ${gaps ? 'active' : ''}`} title="Outline skills that are locked or below 3 stars" aria-pressed={gaps} onClick={() => { const count = activeSkills.filter(s => !isUnlocked(s.id, levels) || (levels[s.id] || 0) < 3).length; setGaps(!gaps); notify(gaps ? 'Skill gaps off. Showing all skills.' : `Skill gaps on: ${plural(count, 'skill')} in ${focus} ${count === 1 ? 'is' : 'are'} locked or below 3 stars (independent work) and outlined in amber. Stronger skills are faded.`, 'info'); }}><Crosshair size={18} /><span className="tool-label">Gaps</span></button><div className="search-wrap"><button className="search-toggle" aria-label="Open skill search" onClick={() => setSearchOpen(!searchOpen)}><Search size={18} /></button><input aria-label="Find a skill" placeholder="Find a skill…" value={query} onFocus={() => setSearchOpen(true)} onChange={e => setQuery(e.target.value)} />{query ? <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button> : <kbd>/</kbd>}{query.trim() && <div className="search-results"><p className="search-count" role="status">{plural(results.length, 'result')}{results.length > 8 ? ' · showing the first 8' : ''}</p>{results.length ? results.slice(0, 8).map(s => { const lock = lockReason(s.id, levels); return <button key={s.id} onClick={() => { setTab('atlas'); select(s, true); setSearchOpen(false); }}><Sigil skill={s} size={20} /><span>{s.name}<small>{s.branch}{lock && ` · Locked · needs ${skillById.get(lock.blocker.id)!.name} at ${starCount(lock.blocker.required)}`}</small></span>{lock ? <LockKeyhole size={14} aria-label="Locked" /> : <span>{levels[s.id] || 0}/5 ★</span>}<ChevronRight size={14}/></button>; }) : <p>No skills match “{query.trim()}”. Try a skill or branch name, or <button className="link-button" onClick={() => setQuery('')}>clear search</button>.</p>}</div>}</div></div>
      {tab === 'atlas' && !inspectorOpen && !modal && <GoalControl goalId={goalId} levels={levels} focus={focus} recommendations={recommendations} onSelect={(id, guide) => { select(skillById.get(id)!, true); if (guide) setGuideRequest(value => value + 1); }} onChange={id => { setGoalId(id); setGoalFade(true); setPathTarget(null); setInspectorOpen(false); focusGoal(id); const goal = goals.find(item => item.id === id); const progress = goalProgress(id, levels); notify(goal ? `${goal.name} goal set · ${progress.completed} of ${progress.total} targets reached.` : 'Goal cleared. Exploring freely.', 'info'); }} onFit={() => { setPathTarget(null); setInspectorOpen(false); focusGoal(goalId); }} />}
      <CameraControls onFit={() => navigate(region, branch)} onOverview={() => { setPathTarget(null); setInspectorOpen(false); setBranch('All branches'); fitSkills(trainableSkills, .16, reduced ? 0 : 700, 2.5, 0, 110); }} />
      <div className="overview-hint">Whole atlas · choose a branch to read skills</div>
      {goalOutsideView && tab === 'atlas' && !inspectorOpen && <div className="goal-fade-hint" role="status">Skills outside your {goalName} goal are faded.<button className="link-button" onClick={() => setGoalFade(false)}>Show all skills</button></div>}
      {path && !inspectorOpen && tab === 'atlas' && <PathControl key={path.target} path={path} onFit={() => fitPath()} onClear={() => setPathTarget(null)} onSelect={id => select(skillById.get(id)!, true, true)} onOpenTarget={() => select(skillById.get(path.target)!, false, true)} />}
      <BoardLegend onHelp={() => setModal('help')} />
      <div ref={flash} className="level-flash" />
      {inspectorOpen && tab === 'atlas' && <Inspector guideRequest={guideRequest} skill={selected} levels={levels} unlocked={unlocked} onSave={save} onClose={() => { setInspectorOpen(false); setPathTarget(null); }} color={branchColors[selected.branch]} goalTarget={route.get(selectedId)} path={path} bodyRef={inspectorBody} onTrace={() => setPathTarget(selectedId)} onShowPath={() => fitPath(pathTarget ?? selectedId, true)} onFocusPath={() => fitPath(pathTarget ?? selectedId)} onRaisePrerequisites={() => raiseFor(selectedId)} onClearPath={() => setPathTarget(null)} onSelect={id => select(skillById.get(id)!, true, true)} />}
      {tab !== 'atlas' && <LibraryOverlay tab={tab} levels={levels} history={history} onClose={() => setTab('atlas')} onSelect={id => { const skill = skillById.get(id); if (!skill) return; setTab('atlas'); select(skill, true); }} />}
    </main>
    <>{notice && !cinematic && <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`toast ${notice.tone}`}>{notice.tone === 'error' ? <AlertTriangle size={16} /> : notice.tone === 'info' ? <Info size={16} /> : <Check size={16} />}<span className="toast-message">{notice.text}</span>{notice.tone === 'error' && notice.text.startsWith('Import failed') && <button className="toast-retry" onClick={() => fileInput.current?.click()}>Retry import</button>}<button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={14} /></button></div>}</>
    <>{cinematic && <div className="cinematic" role="dialog" aria-label={`${cinematic.skill.name} unlocked`} onClick={() => setCinematic(null)}><div className="cinematic-content"><div className="cinematic-rays" /><span className="eyebrow">Unlocked</span><div className="cinematic-symbol"><Sigil skill={cinematic.skill} size={70} /></div><span className="type-badge">{cinematic.skill.kind === 'normal' ? 'Skill' : cinematic.skill.kind === 'mastery' ? 'Mastery skill' : 'Legendary skill'}</span><h2>{cinematic.skill.name}</h2><p>You can now rate {cinematic.skill.name}.{cinematic.others.length > 0 && ` Also unlocked: ${cinematic.others.slice(0, 3).join(', ')}${cinematic.others.length > 3 ? ` and ${cinematic.others.length - 3} more` : ''}.`}</p><button className="gold-button" autoFocus onClick={event => { event.stopPropagation(); const skill = cinematic.skill; setCinematic(null); select(skill, true); }}>Rate {cinematic.skill.name} <ChevronRight size={16} /></button><button className="link-button cinematic-dismiss" onClick={() => setCinematic(null)}>Not now</button></div></div>}</>
    <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e => importProgress(e.target.files?.[0])} />
    {modal && <AtlasModal modal={modal} modalRef={modalRef} onClose={() => setModal(null)} theme={theme} onTheme={setTheme} sound={sound} onSound={toggleSound} sample={sample} onExport={exportProgress} onImport={() => fileInput.current?.click()} onReset={resetJourney} focusReset={resetFocus} />}
  </div>;
}
export default function SkillAtlas() { return <ReactFlowProvider><Atlas /></ReactFlowProvider>; }
