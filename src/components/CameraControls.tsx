'use client';
import { useReactFlow, useStore } from '@xyflow/react';
import { Maximize, Minus, Plus, Map } from 'lucide-react';
import { useReducedMotion } from '@/lib/useReducedMotion';
export default function CameraControls({ onFit, onOverview }: { onFit: () => void; onOverview: () => void }) {
  const flow = useReactFlow();
  // Camera changes subscribe only this tiny control, not the entire application.
  const zoom = useStore(state => Math.round(state.transform[2] * 100));
  const reduced = useReducedMotion();
  return <div className="canvas-controls"><button title="Zoom out" aria-label="Zoom out" onClick={() => flow.zoomOut({ duration: reduced ? 0 : 250 })}><Minus size={17} /></button><span>{zoom}%</span><button title="Zoom in" aria-label="Zoom in" onClick={() => flow.zoomIn({ duration: reduced ? 0 : 250 })}><Plus size={17} /></button><i /><button title="Fit current region" aria-label="Fit current region" onClick={onFit}><Maximize size={17} /></button><button title="View entire atlas" aria-label="View entire atlas" onClick={onOverview}><Map size={18} /></button></div>;
}
