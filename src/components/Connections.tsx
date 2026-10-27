'use client';

import { memo } from 'react';
import type { Edge } from '@xyflow/react';
import { skillById } from '@/lib/progression';

// The graph is fixed and connections are decorative. A single SVG travels with
// the viewport without per-edge store subscriptions, handle measurement, or hit areas.
const geometry = new Map<string, string>();
function pathFor(edge: Edge) {
  let path = geometry.get(edge.id);
  if (!path) {
    const source = skillById.get(edge.source)!;
    const target = skillById.get(edge.target)!;
    path = `M${source.x + 35},${source.y + 35}L${target.x + 35},${target.y + 35}`;
    geometry.set(edge.id, path);
  }
  return path;
}

export default memo(function Connections({ edges }: { edges: Edge[] }) {
  return <svg className="skill-connections" aria-hidden="true" width="1" height="1">
    {edges.map(edge => <path key={edge.id} data-edge-id={edge.id} className={edge.className} d={pathFor(edge)} style={edge.style} fill="none" />)}
  </svg>;
});
