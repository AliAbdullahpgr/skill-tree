'use client';
import { useEffect, useRef } from 'react';
import { BookOpen, Code2, Compass, ExternalLink, FileText, Globe, GraduationCap, Podcast, PlayCircle } from 'lucide-react';
import { roadmapTopics } from '@/lib/roadmap-topics';

const tagIcons = {
  article: FileText,
  official: Globe,
  video: PlayCircle,
  course: GraduationCap,
  book: BookOpen,
  opensource: Code2,
  roadmap: Compass,
  podcast: Podcast,
} as const;

export default function RoadmapResources({ skillId, focusRequest = 0 }: { skillId: string; focusRequest?: number }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusRequest) { heading.current?.scrollIntoView({ block: 'start' }); heading.current?.focus({ preventScroll: true }); }
  }, [skillId, focusRequest]);
  const topic = roadmapTopics[skillId];
  if (!topic) return null;
  return <div className="inspector-section roadmap-section">
    <h3 ref={heading} tabIndex={-1}>Learn from <small>roadmap.sh</small></h3>
    <p className="roadmap-description">{topic.description}</p>
    {topic.resources.length > 0 && <ul className="roadmap-links">{topic.resources.map(resource => {
      const Icon = tagIcons[resource.tag as keyof typeof tagIcons] ?? FileText;
      return <li key={resource.url}><a href={resource.url} target="_blank" rel="noreferrer noopener"><Icon size={13} /><span>{resource.title}</span><em>{resource.tag}</em></a></li>;
    })}</ul>}
    <a className="roadmap-source" href={`https://roadmap.sh/${topic.roadmap}`} target="_blank" rel="noreferrer noopener">Open the {topic.roadmap.replace(/-/g, ' ')} roadmap <ExternalLink size={12} /></a>
  </div>;
}
