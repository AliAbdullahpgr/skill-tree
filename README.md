# Arcana — Skill Tree RPG

A personal skill atlas inspired by ancient sigil trees and dark fantasy MMORPGs. Explore 228 interconnected skills across Engineering, Problem Solving, and Personal Skills. Engineering includes 214 skills across Frontend, Backend, Databases, System Design, AI, DSA, DevOps, Security, Testing, and Mobile.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production static export, run `npm run build`; the deployable output is `out/`. No database, API key, or account is required.

## Features

- A continuous XYFlow board occupying 93–95% of the viewport, with pan, wheel/pinch zoom, search, realm travel, and clickable branch labels. No permanent sidebar or inspector.
- Normal, Mastery, and Legendary nodes with real, locally bundled Devicon technology logos.
- Self-assessed levels from 1–10; level 0 represents untrained skills. Roots start open. All prerequisites must reach their configured levels before descendants unlock.
- Recursive prerequisite checks: reducing a prerequisite reseals descendants while preserving their recorded levels.
- Highlighted prerequisite connections, selected-node runes, capped ambient canvas particles, native browser level flashes and unlock cinematics, and optional synthesized sound.
- Browser-local autosave, JSON backup/export/import, progress chronicle, searchable codex, and skill-gap highlighting.
- Midnight and Moonstone themes, responsive mobile layout with a readable initial zoom, keyboard-focus indicators, dialog focus trapping, and reduced-motion support.

The first visit loads a clearly labeled **example build** to demonstrate progression. Use **Settings → Start a fresh journey** to begin tracking your own skills. Saves stay in the current browser and origin; export before switching devices or clearing site data. There is no cloud sync.

## Configuration

Edit `src/lib/skills.json` to add or rearrange skills:

```json
{
  "id": "example",
  "name": "Example skill",
  "region": "Engineering",
  "branch": "Frontend",
  "x": 100,
  "y": 200,
  "icon": "react",
  "kind": "normal",
  "prerequisites": [{ "id": "javascript", "level": 4 }],
  "initialLevel": 0,
  "description": "What this skill represents."
}
```

Identifiers must be unique, prerequisite references must exist, and the prerequisite graph must remain acyclic. Local logos live in `public/icons/`. Regions and their UI labels are defined in `src/components/SkillAtlas.tsx`. Theme variables live in `src/app/globals.css`.

## Stack and structure

Next.js App Router + TypeScript, React 19, Tailwind CSS 4 with bespoke fantasy CSS, XYFlow, native Web Animations/CSS, and the Canvas API. Static export hosting is configured in `next.config.ts` and `.openai/hosting.json`.

- `src/components/SkillAtlas.tsx`: canvas, interactions, progression editor, accessibility, and application shell.
- `src/lib/progression.ts`: pure progression rules and save validation.
- `src/lib/skills.json`: configurable graph and demonstration levels.
- `src/lib/progression.test.ts`: progression and graph integrity tests.
- `public/art/`: generated background and character portrait.
- `scripts/browser-check.mjs`: production browser smoke test.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

For browser verification, serve the static output and run the smoke test in another terminal:

```sh
python3 -m http.server 3091 --directory out
npx playwright install chromium
node scripts/browser-check.mjs
```

`TEST_URL` overrides the test origin and `CHROMIUM_PATH` optionally supplies a browser executable. The test exercises level changes, automatic Mastery unlocking, persistence after reload, codex, chronicle, region navigation, themes, backup import/export, zoom, and mobile behavior.

## Artwork and attribution

The celestial atlas and Wayfarer portrait were generated with the built-in image generation tool and optimized as WebP. These original assets remain available for future themes; the current board uses a quiet procedural backdrop for readability. See `ARTWORK.md` for exact prompts. Technology logos are bundled from Devicon; their license is in `public/icons/LICENSE`. Trademarks belong to their respective owners. Marcellus and Manrope fonts are self-hosted, with local system fallbacks. Font licenses are bundled in `public/fonts/`.

## Board-first design revision

Reviewed [PoE 2 Planner](https://poe2planner.app/) for canvas-first interaction and [roadmap.sh](https://roadmap.sh/frontend) for clear skill hierarchy. The revised interface removes persistent character, navigation, headline, and inspector columns. A 52px header (48px on phones) is the only reserved layout space. Search, realm travel, and camera controls float on the board; skill details appear only after selection. Keyboard Enter/Space opens a focused node, `/` focuses search, and Escape dismisses overlays.

The midnight palette uses `#090c12` for the board, `#141923` for floating surfaces, `#eef1f8` for primary text, and `#9faec5` for secondary text. Nodes encode progression as silver (0–2), cyan (3–4), blue (5–7), violet (8–9), and gold (10); zero-level available skills have dashed borders. Mastery and Legendary nodes retain distinct silhouettes.

## Expanded engineering and rendering performance

| Branch | Skills |
| --- | ---: |
| Frontend | 28 |
| Backend | 26 |
| Databases | 24 |
| System Design | 24 |
| AI | 24 |
| DSA | 24 |
| DevOps | 18 |
| Security | 15 |
| Testing | 15 |
| Mobile | 15 |

Engineering also has its central foundation node, for 214 engineering skills and 228 skills overall. Existing IDs, prerequisites, and local-storage keys are preserved. New skills start at level zero when loading an older save. All skills remain reachable and searchable; branch labels and the realm menu provide direct travel. The board opens on Frontend at a useful scale instead of shrinking all 228 nodes into the screen.

Performance changes:

- XYFlow viewport culling mounts only visible nodes. Decorative connections share one memoized SVG, without per-edge store subscriptions, hit targets, or handle measurements; the entire graph remains available for navigation.
- Prerequisite results use an indexed, memoized traversal per immutable level snapshot. A WeakMap avoids retaining old snapshots.
- Zoom readouts subscribe separately; dragging no longer updates application React state. Overview appearance changes only when crossing a zoom threshold; zoom-dependent label sizing is scoped to the labels instead of invalidating styles across every node.
- Node memoization compares actual skill state. Ambient particles paint only on resize; a compositor animation moves the bitmap without a JavaScript frame loop and pauses while moving the board.
- Idle edge/rune animations and expensive moving-camera glow are reduced. Labels simplify at overview zoom while branch names remain readable.
- Native browser animations replace GSAP and Framer Motion for the small effects used here. Fonts and logos are local assets. Fonts use real WOFF2 compression (140 KB total versus 423 KB), preserving all glyphs and weights.

To reproduce the browser comparison, serve `out/`, then run `node scripts/performance-check.mjs current`. It runs three cold browser pages, performs the same 80-step drag, and writes per-run and median metrics to `.artifacts/`. Measurements are specific to this machine/browser and are not universal speed guarantees. The initial comparison measured 851 KB versus 714 KB decoded JavaScript (16% less) with the larger graph. A focused 22,800-check prerequisite benchmark measured 68.72 ms for the former recursive lookup versus 4.11 ms for cached evaluation.

A second optimization pass removes backdrop blurring behind persistent controls and limits continuous rune animation to the selected node. On the same 228-node graph, an isolated three-run Chromium comparison measured median node-ready time of 882 → 677 ms, pan JavaScript of 124 → 61 ms, total pan CPU of 954 → 672 ms, and sampled JS heap of 15 → 9 MB. These local headless measurements are indicative, not guarantees for every device or network; font transfer is measured separately from decoded JavaScript.

## Guided progression (priorities 6 → 5 → 1 → 2 → 3)

- **Zoom readability:** semantic zoom progressively reveals labels and node detail; overview connections fade so branch summaries stay readable. At the widest phone zoom, tap the Engineering summary to enter the branches.
- **Goal paths:** the floating goal control offers Frontend, Backend, and AI Engineer routes. Each includes explicit target levels and the full prerequisite closure. Other skills remain visible. Goals persist locally and in version-1 backup exports; older backups safely load without a goal.
- **Level milestones:** every skill has a distinct practice task plus a cumulative 1–10 assessment rubric. The guide follows the level editor and loads on demand. Level 10 asks for sustained, peer-reviewed impact rather than completion of one exercise. These are suggested self-assessment standards, not credentials.
- **Next skills:** the Next control lists three reachable suggestions with a reason and a target level. Gold dots mark them on the board. Recommendations favor concrete unlocks and respect the active goal; saving levels recomputes them. Completed goals display an explicit completion message.
- **Prerequisite tracing:** selecting a locked skill highlights all ancestors and dims unrelated paths. The inspector lists the strongest required level for each ancestor, exact deficits, and blocked saved levels. Inspecting ancestors retains the original target. Fit the entire path or clear it using the floating chip; Escape also clears it.

Configuration: `src/lib/goals.ts` defines role targets; `src/lib/milestone-tasks.json` defines skill-specific practice tasks; `src/lib/milestones.ts` defines the shared assessment rubric. `src/lib/recommendations.ts` and `src/lib/dependencies.ts` contain deterministic, tested graph logic. No external AI service or account is needed.

Run `node scripts/priorities-check.mjs` against the production preview to exercise the complete guided progression flow in addition to the existing browser checks.
