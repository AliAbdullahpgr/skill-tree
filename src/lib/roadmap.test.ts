import test from 'node:test';
import assert from 'node:assert/strict';
import { skills, skillById } from './progression';
import { hasRoadmapGuide, roadmapCoverage } from './roadmap';
import content from './roadmap-content.json';

const topics = content.topics as Record<string, {
  title: string;
  roadmap: string;
  description: string;
  resources: { tag: string; title: string; url: string }[];
}>;

test('every generated guide belongs to a known skill', () => {
  for (const id of Object.keys(topics)) assert.ok(skillById.has(id), `unknown skill id: ${id}`);
  assert.deepEqual(Object.keys(topics).sort(), [...roadmapCoverage.skillsWithGuides].sort());
});

test('every guide has a roadmap and description', () => {
  for (const [id, topic] of Object.entries(topics)) {
    assert.ok(topic.roadmap.length > 0, id);
    assert.ok(topic.description.length > 20, id);
    assert.ok(Array.isArray(topic.resources), `${id} has malformed resources`);
  }
});

test('guide resources are unique absolute links', () => {
  for (const [id, topic] of Object.entries(topics)) {
    const urls = new Set<string>();
    for (const resource of topic.resources) {
      assert.match(resource.url, /^https?:\/\//, `${id}: ${resource.url}`);
      assert.ok(resource.title.length > 0, `${id}: empty resource title`);
      assert.ok(!urls.has(resource.url), `${id}: duplicate ${resource.url}`);
      urls.add(resource.url);
    }
  }
});

test('coverage helpers agree with the generated content', () => {
  assert.equal(roadmapCoverage.skillsWithGuides.length, Object.keys(topics).length);
  assert.equal(roadmapCoverage.totalSkills, skills.length);
  for (const skill of skills) assert.equal(hasRoadmapGuide(skill.id), Boolean(topics[skill.id]));
});
