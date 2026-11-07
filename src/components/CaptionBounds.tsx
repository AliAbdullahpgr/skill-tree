'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useOnViewportChange, useReactFlow } from '@xyflow/react';

// Keep a visible node's whole name inside the board. Do this after movement,
// without subscribing the atlas component to every camera frame.
export default function CaptionBounds() {
  const flow = useReactFlow();
  const marker = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const constrain = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const board = marker.current?.closest('.react-flow');
      if (!board) return;
      const bounds = board.getBoundingClientRect();
      const zoom = flow.getZoom();
      const captions = [...board.querySelectorAll<HTMLElement>('.node-caption')];
      captions.forEach(caption => caption.style.setProperty('--caption-shift-x', '0px'));
      const positions = captions.map(caption => {
        const label = caption.getBoundingClientRect();
        const node = caption.parentElement!.getBoundingClientRect();
        const shift = label.left < bounds.left + 8 ? bounds.left + 8 - label.left : label.right > bounds.right - 8 ? bounds.right - 8 - label.right : 0;
        const clipped = node.right < bounds.left || node.left > bounds.right || label.top < bounds.top || label.bottom > bounds.bottom;
        return { caption, shift, clipped };
      });
      positions.forEach(({ caption, shift, clipped }) => {
        caption.style.setProperty('--caption-shift-x', `${shift / zoom}px`);
        caption.dataset.clipped = String(clipped);
      });
    });
  }, [flow]);
  useOnViewportChange({ onEnd: constrain });
  useEffect(() => {
    const board = marker.current?.closest('.react-flow');
    if (!board) return;
    const observer = new ResizeObserver(constrain);
    observer.observe(board);
    constrain();
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, [constrain]);
  return <span ref={marker} hidden/>;
}
