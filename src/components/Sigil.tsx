'use client';
import { useState } from 'react';
import { Code2 } from 'lucide-react';
import type { Skill } from '@/lib/progression';

// Every skill names a file in public/icons: a technology logo or a concept glyph.
export default function Sigil({ skill, size = 24 }: { skill: Skill; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (skill.icon && !failed) return <img alt="" width={size} height={size} decoding="async" src={`/icons/${skill.icon}.svg`} onError={() => setFailed(true)} draggable={false} />;
  return <Code2 size={size} strokeWidth={1.3} />;
}
