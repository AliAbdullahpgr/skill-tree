import content from './roadmap-content.json';

export type RoadmapResource = { tag: string; title: string; url: string };
export type RoadmapTopic = {
  title: string;
  roadmap: string;
  nodeId: string;
  description: string;
  resources: RoadmapResource[];
};

export const roadmapTopics = content.topics as Record<string, RoadmapTopic>;
