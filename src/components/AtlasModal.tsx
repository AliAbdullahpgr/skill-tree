'use client';
import type { RefObject } from 'react';
import { Check, ChevronRight, Download, RotateCcw, Upload, Volume2, VolumeX, X } from 'lucide-react';

type Props = {
  modal: 'settings' | 'help'; modalRef: RefObject<HTMLElement | null>; onClose: () => void;
  theme: string; onTheme: (theme: string) => void; sound: boolean; onSound: () => void; sample: boolean;
  onExport: () => void; onImport: () => void; onReset: () => void;
};

export default function AtlasModal({ modal, modalRef, onClose, theme, onTheme, sound, onSound, sample, onExport, onImport, onReset }: Props) {
  const settings = modal === 'settings';
  return <div className="modal-backdrop" onClick={onClose}><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-label={settings ? 'Atlas settings' : 'A guide to your atlas'} onClick={e => e.stopPropagation()}>
    <button className="modal-close icon-button" autoFocus onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
    <h2>{settings ? 'Atlas settings' : 'Explore your skill board'}</h2>
    {settings ? <>
      <h3>Atmosphere</h3>
      <div className="theme-options">{['obsidian', 'moonstone'].map(t => <button key={t} className={theme === t ? 'active' : ''} onClick={() => onTheme(t)}>{t === 'obsidian' ? 'Midnight' : 'Moonstone'}{theme === t && <Check size={14} />}</button>)}</div>
      <div className="theme-options sound-option"><button className={sound ? 'active' : ''} aria-pressed={sound} onClick={onSound}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}Unlock sounds {sound ? 'on' : 'off'}</button></div>
      <h3>Your progress</h3>
      <p>Progress lives in this browser. Keep a backup before changing devices or clearing browser data.</p>
      <div className="backup-actions"><button onClick={onExport}><Download size={16} />Export backup</button><button onClick={onImport}><Upload size={16} />Import backup</button></div>
      <div className="reset-area"><h3>Begin your own legend</h3><p>{sample ? 'You are exploring an example build. Start fresh to track your own skills.' : 'Reset all levels and your chronicle. Export a backup first if you want to keep them.'}</p><button onClick={onReset}><RotateCcw size={14} />Start a fresh journey</button></div>
    </> : <>
      <p>The board maps real-world skills and how they build on each other. Drag to move, scroll or pinch to zoom, and use the realm menu to jump between areas.</p>
      <h3>Rate your skills</h3>
      <p>Select an unlocked skill and set a level from 0 to 10. Each level has a plain description and a practice task, so you can judge yourself honestly.</p>
      <h3>Unlock the next step</h3>
      <p>A locked skill unlocks once every prerequisite reaches its required level. Select a locked skill to trace its whole prerequisite path and see how many levels each step still needs. Lowering a prerequisite locks the skills after it again, but keeps the levels you recorded.</p>
      <h3>Plan a route</h3>
      <p>Choose a goal to highlight one role’s skills and target levels. Next suggests up to three skills to work on, from your goal or from the branch you are viewing.</p>
      <h3>Read the board</h3>
      <p>Ring color follows level: silver for 0–2, cyan for 3–4, blue for 5–7, violet for 8–9, and gold at 10. A diamond marks a Mastery skill and a star marks a Legendary one. The crosshair button highlights locked and low-level skills.</p>
      <h3>Find your way</h3>
      <p>Press / to search. The codex lists every skill with filters, and the chronicle records each level you save. The map button shows the whole board.</p>
      <button className="gold-button" onClick={onClose}>Enter the atlas <ChevronRight size={15} /></button>
    </>}
  </section></div>;
}
