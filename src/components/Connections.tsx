'use client';

import { memo } from 'react';
import type { Edge } from '@xyflow/react';
import { skillById, trainableSkills } from '@/lib/progression';

// The graph is fixed and connections are decorative. A single SVG travels with
// the viewport without per-edge store subscriptions, handle measurement, or hit areas.
const geometry = new Map<string, string>();
const CLEARANCE = 55; // flow units from a node centre that a line must avoid

// Distance from point p to the segment a–b, and how far along the segment it projects.
function nearest(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return { distance: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}

function pathFor(edge: Edge) {
  let path = geometry.get(edge.id);
  if (!path) {
    const source = skillById.get(edge.source)!, target = skillById.get(edge.target)!;
    const ax = source.x + 35, ay = source.y + 35, bx = target.x + 35, by = target.y + 35;
    // A straight line through an unrelated node reads as if that node were on the path,
    // so bend around the closest one instead.
    const blocker = trainableSkills
      .filter(skill => skill.id !== source.id && skill.id !== target.id)
      .map(skill => ({ skill, ...nearest(skill.x + 35, skill.y + 35, ax, ay, bx, by) }))
      .filter(hit => hit.t > .05 && hit.t < .95 && hit.distance < CLEARANCE)
      .sort((a, b) => a.distance - b.distance)[0];
    if (blocker) {
      const length = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / length, ny = (bx - ax) / length;
      const cx = blocker.skill.x + 35, cy = blocker.skill.y + 35;
      // Captions sit below nodes, so mostly horizontal lines arc above the blocker;
      // other lines bend away from it, on the side the line already leans to.
      const side = Math.abs(bx - ax) > Math.abs(by - ay) ? (ny > 0 ? -1 : 1) : (cx - ax) * nx + (cy - ay) * ny > 0 ? -1 : 1;
      const offset = (CLEARANCE * 2.6) * side;
      const mx = (ax + bx) / 2 + nx * offset, my = (ay + by) / 2 + ny * offset;
      path = `M${ax},${ay}Q${mx},${my} ${bx},${by}`;
    } else path = `M${ax},${ay}L${bx},${by}`;
    geometry.set(edge.id, path);
  }
  return path;
}

export default memo(function Connections({ edges }: { edges: Edge[] }) {
  return <svg className="skill-connections" aria-hidden="true" width="1" height="1">
    {edges.map(edge => <path key={edge.id} data-edge-id={edge.id} className={edge.className} d={pathFor(edge)} style={edge.style} fill="none" />)}
  </svg>;
});
