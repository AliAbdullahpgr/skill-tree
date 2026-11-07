/**
 * Builds a local, offline index of roadmap.sh topic content for SkillWeave.
 *
 * Source of truth: the cloned developer-roadmap repository (`roadmap-sh/`).
 * We deliberately do not call the roadmap.sh API. Only the repository's
 * markdown topic files are read: each file holds a title, a short description
 * and a list of curated `[@tag@Title](url)` resources.
 *
 * Output:
 *   src/lib/roadmap-content.json  — per-skill description and resources
 *   .artifacts/roadmap-gaps.json  — unmatched skills and topic coverage report
 *
 * Run: node scripts/build-roadmap-index.mjs [--report]
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(ROOT, 'roadmap-sh', 'roadmaps');
const SKILLS_PATH = path.join(ROOT, 'src', 'lib', 'skills.json');
const ALIASES_PATH = path.join(ROOT, 'scripts', 'roadmap-aliases.json');
const OUT_PATH = path.join(ROOT, 'src', 'lib', 'roadmap-content.json');
const COVERAGE_PATH = path.join(ROOT, 'src', 'lib', 'roadmap-coverage.json');
const REPORT_PATH = path.join(ROOT, '.artifacts', 'roadmap-gaps.json');

// Roadmaps that can supply content for each SkillWeave branch, most specific first.
const branchRoadmaps = {
  Frontend: ['frontend', 'javascript', 'typescript', 'react', 'nextjs', 'vue', 'angular', 'css', 'html'],
  Backend: ['backend', 'api-design', 'nodejs', 'python', 'java', 'golang', 'rust', 'php', 'ruby', 'csharp', 'spring-boot', 'django', 'laravel'],
  Databases: ['postgresql-dba', 'mongodb', 'redis', 'sql', 'backend', 'data-engineer', 'bi-analyst'],
  'System Design': ['system-design', 'computer-science', 'software-design-architecture', 'software-architect', 'api-design', 'devops', 'backend', 'blockchain'],
  AI: ['ai-engineer', 'ai-agents', 'machine-learning', 'prompt-engineering', 'ai-data-scientist', 'inference-engineering'],
  DSA: ['datastructures-and-algorithms', 'leetcode', 'computer-science'],
  DevOps: ['devops', 'docker', 'kubernetes', 'terraform', 'aws', 'linux', 'shell-bash', 'cloud-computing', 'devops-beginner', 'devsecops', 'ai-agents', 'product-manager', 'backend'],
  Security: ['cyber-security', 'devsecops', 'ai-red-teaming', 'api-design', 'backend', 'frontend', 'cloudflare', 'computer-science'],
  Testing: ['qa', 'code-review', 'api-design', 'rust', 'frontend', 'angular', 'backend'],
  Mobile: ['android', 'ios', 'react-native', 'flutter', 'frontend'],
};

const STOP_WORDS = new Set(['and', 'the', 'of', 'for', 'with', 'a', 'an', 'to', 'in', 'on', 'your']);
const TAG_PRIORITY = ['official', 'article', 'course', 'video', 'book', 'opensource', 'podcast', 'roadmap'];
const MAX_RESOURCES = 6;

const normalizeWords = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) =>
  normalizeWords(value)
    .split(' ')
    .map((word) => word.replace(/^[-.]+|[-.]+$/g, ''))
    .filter((word) => word && !STOP_WORDS.has(word));

const key = (value) => normalizeWords(value).replace(/[\s.-]/g, '');

function tokenScore(skillTokens, topicTokens) {
  if (!skillTokens.length || !topicTokens.length) return 0;
  const skillSet = new Set(skillTokens);
  const topicSet = new Set(topicTokens);
  const shared = [...skillSet].filter((token) => topicSet.has(token)).length;
  return shared / Math.max(skillSet.size, topicSet.size);
}

function parseTopic(text, file) {
  const titleMatch = text.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : file.replace(/@[^@]+\.md$/, '').replace(/-/g, ' ');
  const body = text.replace(/^#.*$/m, '');
  const description = body.split(/Visit the following resources/i)[0].replace(/\s+/g, ' ').trim();
  const resources = [];
  const seen = new Set();
  for (const match of text.matchAll(/\[@([a-z-]+)@([^\]]+)\]\(([^)]+)\)/g)) {
    const tag = match[1];
    const url = match[3].trim();
    const dedupe = url.replace(/\/$/, '').toLowerCase();
    if (seen.has(dedupe) || !/^https?:\/\//i.test(url)) continue;
    seen.add(dedupe);
    resources.push({ tag, title: match[2].trim(), url });
  }
  resources.sort((a, b) => {
    const ai = TAG_PRIORITY.indexOf(a.tag);
    const bi = TAG_PRIORITY.indexOf(b.tag);
    return (ai === -1 ? TAG_PRIORITY.length : ai) - (bi === -1 ? TAG_PRIORITY.length : bi);
  });
  return {
    title,
    description,
    resources: resources.slice(0, MAX_RESOURCES),
    nodeId: file.match(/@([^@]+)\.md$/)?.[1] ?? '',
  };
}

async function readAliases() {
  try {
    const parsed = JSON.parse(await readFile(ALIASES_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function loadTopics() {
  const slugs = (await readdir(CONTENT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const topics = [];
  for (const slug of slugs) {
    const dir = path.join(CONTENT_ROOT, slug, 'content');
    let files;
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const topic = parseTopic(await readFile(path.join(dir, file), 'utf8'), file);
      if (!topic.description) continue;
      topics.push({ ...topic, roadmap: slug });
    }
  }
  return topics;
}

function chooseTopic(skill, candidates, aliases, allTopics) {
  const alias = aliases[skill.id] ?? aliases[skill.name];
  if (alias) {
    const wanted = typeof alias === 'string' ? { title: alias } : alias;
    // Aliases are explicit, so they may point outside the branch's roadmap list.
    const match = allTopics.find(
      (topic) =>
        key(topic.title) === key(wanted.title) && (!wanted.roadmap || topic.roadmap === wanted.roadmap),
    );
    if (match) return { topic: match, how: 'alias' };
  }

  const skillKey = key(skill.name);
  const skillIdKey = key(skill.id);
  const exact = candidates.find((topic) => key(topic.title) === skillKey || key(topic.title) === skillIdKey);
  if (exact) return { topic: exact, how: 'exact' };

  const skillTokens = tokenize(skill.name);
  let best = null;
  let bestScore = 0;
  let ties = 0;
  for (const topic of candidates) {
    const score = tokenScore(skillTokens, tokenize(topic.title));
    if (score > bestScore + 1e-9) {
      best = topic;
      bestScore = score;
      ties = 1;
    } else if (Math.abs(score - bestScore) < 1e-9 && score > 0) {
      ties++;
    }
  }
  // Conservative: only accept a fuzzy match when it is strong and unambiguous.
  if (best && bestScore >= 0.75 && ties === 1) return { topic: best, how: `fuzzy:${bestScore.toFixed(2)}` };
  return null;
}

function mergeTopic(primary, extras) {
  const resources = [];
  const seen = new Set();
  for (const topic of [primary, ...extras]) {
    for (const resource of topic.resources) {
      const dedupe = resource.url.replace(/\/$/, '').toLowerCase();
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      resources.push(resource);
    }
  }
  resources.sort((a, b) => {
    const ai = TAG_PRIORITY.indexOf(a.tag);
    const bi = TAG_PRIORITY.indexOf(b.tag);
    return (ai === -1 ? TAG_PRIORITY.length : ai) - (bi === -1 ? TAG_PRIORITY.length : bi);
  });
  return {
    title: primary.title,
    roadmap: primary.roadmap,
    nodeId: primary.nodeId,
    description: primary.description,
    resources: resources.slice(0, MAX_RESOURCES),
  };
}

async function main() {
  const skills = JSON.parse(await readFile(SKILLS_PATH, 'utf8'));
  const aliases = await readAliases();
  const topics = await loadTopics();

  const byBranch = new Map();
  for (const topic of topics) {
    if (!byBranch.has(topic.roadmap)) byBranch.set(topic.roadmap, []);
    byBranch.get(topic.roadmap).push(topic);
  }

  const index = {};
  const unmatched = [];
  const matches = [];
  for (const skill of skills) {
    const slugs = branchRoadmaps[skill.branch] ?? [];
    if (!slugs.length) {
      unmatched.push(skill.name);
      continue;
    }
    const candidates = slugs.flatMap((slug) => byBranch.get(slug) ?? []);
    const picked = chooseTopic(skill, candidates, aliases, topics);
    if (!picked) {
      unmatched.push(skill.name);
      continue;
    }
    const { topic } = picked;
    // Merge resources for other roadmaps in the same branch that cover the same title.
    const extras = candidates.filter(
      (candidate) => candidate !== topic && key(candidate.title) === key(topic.title),
    );
    index[skill.id] = mergeTopic(topic, extras);
    matches.push({ id: skill.id, name: skill.name, roadmap: topic.roadmap, topic: topic.title, how: picked.how });
  }

  const payload = {
    source: 'kamranahmedse/developer-roadmap (local clone, offline)',
    generatedBy: 'scripts/build-roadmap-index.mjs',
    topics: index,
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(payload)}\n`, 'utf8');
  await writeFile(
    COVERAGE_PATH,
    `${JSON.stringify({
      source: payload.source,
      totalSkills: skills.length,
      totalTopics: topics.length,
      skillsWithGuides: Object.keys(index).sort(),
    })}\n`,
    'utf8',
  );

  const perBranch = {};
  for (const skill of skills) {
    if (!branchRoadmaps[skill.branch]) continue;
    const row = (perBranch[skill.branch] ??= { total: 0, matched: 0 });
    row.total++;
    if (index[skill.id]) row.matched++;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'roadmap-sh/roadmaps (local clone)',
    totalTopicsInSource: topics.length,
    totalSkills: skills.length,
    matchedSkills: Object.keys(index).length,
    unmatchedSkills: unmatched,
    perBranch,
    matches,
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Indexed ${Object.keys(index).length}/${skills.length} skills from ${topics.length} local topics.`);
  for (const [branch, row] of Object.entries(perBranch)) {
    console.log(`  ${branch.padEnd(14)} ${row.matched}/${row.total}`);
  }
  if (process.argv.includes('--report')) {
    for (const match of matches) {
      console.log(`  ${match.name}  →  ${match.roadmap}:${match.topic}  (${match.how})`);
    }
    if (unmatched.length) console.log(`Unmatched: ${unmatched.join(', ')}`);
  }
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)} and ${path.relative(ROOT, REPORT_PATH)}`);
}

await main();
