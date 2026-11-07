'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AlertTriangle, Check, ChevronRight, Download, RotateCcw, Upload, Volume2, X } from 'lucide-react';
import { SkillLegend } from './BoardLegend';

type Props = {
  modal: 'settings' | 'help'; modalRef: RefObject<HTMLElement | null>; onClose: () => void;
  theme: string; onTheme: (theme: string) => void; sound: boolean; onSound: () => void; sample: boolean;
  onExport: () => void; onImport: () => void; onReset: () => void; focusReset?: boolean;
};

export default function AtlasModal({ modal, modalRef, onClose, theme, onTheme, sound, onSound, sample, onExport, onImport, onReset, focusReset }: Props) {
  const settings = modal === 'settings';
  const [resetArmed, setResetArmed] = useState(false);
  const resetRef = useRef<HTMLDivElement>(null);
  // "Reset demo" opens Settings at the reset section instead of the top of the dialog.
  useEffect(() => { if (settings && focusReset) requestAnimationFrame(() => { resetRef.current?.scrollIntoView({ block: 'nearest' }); resetRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }); }, [settings, focusReset]);
  return <div className="modal-backdrop" onClick={onClose}><section ref={modalRef} className={`modal ${settings ? '' : 'help-modal'}`} role="dialog" aria-modal="true" aria-label={settings ? 'Atlas settings' : 'A guide to your atlas'} onClick={e => e.stopPropagation()}>
    <button className="modal-close icon-button" autoFocus={!focusReset} onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
    <h2>{settings ? 'Settings' : 'Explore your skill board'}</h2>
    <div className="modal-body">
    {settings ? <>
      <h3>Appearance</h3>
      <div className="theme-options">{['obsidian', 'moonstone'].map(t => <button key={t} aria-pressed={theme === t} className={theme === t ? 'active' : ''} onClick={() => onTheme(t)}><span className={`theme-swatch ${t}`} aria-hidden="true"><i/><i/><i/></span><span>{t === 'obsidian' ? 'Midnight' : 'Moonstone'}<small>{t === 'obsidian' ? 'Deep charcoal, cool blue' : 'Soft slate, brighter contrast'}</small></span>{theme === t && <Check size={14} />}</button>)}</div>
      <button className="sound-setting" role="switch" aria-checked={sound} aria-label="Sound effects" onClick={onSound}><Volume2 size={17}/><span>Sound effects<small>Play a chime when you rate a skill.</small></span><span className={`switch-track ${sound ? 'on' : ''}`} aria-hidden="true"><i/></span><strong>{sound ? 'On' : 'Off'}</strong></button>
      <h3>Your progress</h3>
      <p><strong>No account.</strong> Progress lives in this browser only. Keep a backup before changing devices or clearing browser data.</p>
      <div className="backup-actions"><button onClick={onExport}><Download size={16} />Export backup</button><button onClick={onImport}><Upload size={16} />Import backup</button></div>
      <div ref={resetRef} className={`reset-area ${resetArmed ? 'armed' : ''}`}><h3>Reset progress</h3><p>{sample ? 'Clear the demo ratings and all history, including any changes you made. Then rate your own skills from the foundations.' : 'Erase all skill ratings and history in this browser. Export a backup first to keep them.'}</p>{!resetArmed ? <button className="danger-button" onClick={() => setResetArmed(true)}><RotateCcw size={14} />Reset progress</button> : <div className="reset-confirm" role="alert"><div className="reset-confirm-heading"><AlertTriangle size={15} /><strong>Erase all ratings and history?</strong></div><p>This clears every saved rating and your history in this browser. It cannot be undone without a backup.</p><div className="reset-confirm-actions"><button className="danger-button" onClick={() => { setResetArmed(false); onReset(); }}>Yes, erase my progress</button><button onClick={() => setResetArmed(false)}>Cancel</button></div></div>}</div>
    </> : <>
      <ol className="help-steps">
        <li><strong>Choose a skill</strong><p>Open Skills to search the full list, or choose an area from the menu at the top left.</p></li>
        <li><strong>Rate what you can do</strong><p>Choose one to five proficiency stars. Your rating saves immediately; Clear returns it to unrated. Locked skills list the prerequisites you need to raise first.</p></li>
        <li><strong>Take the next step</strong><p>Choose a goal for role targets. Next suggests reachable skills with a reason, a proficiency target, and learning guides. History records your saves.</p></li>
      </ol>
      <SkillLegend/>
      <h3>Move around</h3>
      <p>Drag to pan; scroll or pinch to zoom. Fit returns to your current branch. The map shows all branches; choose one to read its skills. Press / to search, or Escape to close a panel.</p>
      <p>Lowering a prerequisite locks later skills again, while preserving their saved ratings. If you already know an advanced skill, open it and choose “I already know” to set its prerequisites to the minimum. Goal counts include prerequisite targets.</p>
      <p><strong>No account — saved in this browser only.</strong> Export a backup in Settings before changing devices.</p>
    </>}
    </div>
    {!settings && <div className="modal-footer"><button className="gold-button" onClick={onClose}>Back to the board <ChevronRight size={15} /></button></div>}
  </section></div>;
}
