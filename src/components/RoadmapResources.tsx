'use client';
import { useEffect, useRef } from 'react';
import { BookOpen, Code2, Compass, ExternalLink, FileText, Globe, GraduationCap, Podcast, PlayCircle } from 'lucide-react';
import { roadmapTopics } from '@/lib/roadmap-topics';
import { skillById } from '@/lib/progression';

const tagIcons = {
  article: FileText, official: Globe, video: PlayCircle, course: GraduationCap,
  book: BookOpen, opensource: Code2, roadmap: Compass, podcast: Podcast,
} as const;
const tagLabels: Record<string, string> = { official: 'Official docs', opensource: 'Open source', article: 'Article', video: 'Video', course: 'Course', book: 'Book', roadmap: 'Roadmap', podcast: 'Podcast' };

export default function RoadmapResources({ skillId, focusRequest = 0 }: { skillId: string; focusRequest?: number }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusRequest) { heading.current?.scrollIntoView({ block: 'start' }); heading.current?.focus({ preventScroll: true }); }
  }, [skillId, focusRequest]);
  const topic = roadmapTopics[skillId];
  if (!topic) return null;
  return <section className="inspector-section roadmap-section" aria-label="Roadmap learning content">
    <h3 ref={heading} tabIndex={-1}>Learn from <small>roadmap.sh</small></h3>
    {topic.title.toLowerCase() !== skillById.get(skillId)?.name.toLowerCase() && <h4 className="roadmap-topic-title">{topic.title}</h4>}
    <p className="roadmap-description">{topic.description}</p>
    {topic.resources.length > 0 && <>
      <h4 className="roadmap-resource-heading">Resources <span>{topic.resources.length}</span></h4>
      <ul className="roadmap-links">{topic.resources.map(resource => {
        const Icon = tagIcons[resource.tag as keyof typeof tagIcons] ?? FileText;
        return <li key={resource.url}><a href={resource.url} target="_blank" rel="noreferrer noopener"><Icon size={18}/><span>{resource.title}<small>{tagLabels[resource.tag] ?? resource.tag}</small></span><ExternalLink size={13}/></a></li>;
      })}</ul>
    </>}
    <a className="roadmap-source" href={`https://roadmap.sh/${topic.roadmap}`} target="_blank" rel="noreferrer noopener">Full {topic.roadmap.replace(/-/g, ' ')} roadmap <ExternalLink size={13}/></a>
  </section>;
}
