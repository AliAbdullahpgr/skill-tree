# Arcana — Skill Tree RPG

A personal skill atlas inspired by ancient sigil trees and dark fantasy MMORPGs. Explore 42 interconnected skills across Engineering, Problem Solving, and Personal Skills. The six engineering branches cover Frontend, Backend, Databases, System Design, AI, and DSA.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production static export, run `npm run build`; the deployable output is `out/`. No database, API key, or account is required.

## Features

- Pan, wheel/pinch zoom, minimap, search, realm navigation, and branch navigation on one continuous XYFlow graph.
- Normal, Mastery, and Legendary nodes with real, locally bundled Devicon technology logos.
- Self-assessed levels from 1–10; level 0 represents untrained skills. Roots start open. All prerequisites must reach their configured levels before descendants unlock.
- Recursive prerequisite checks: reducing a prerequisite reseals descendants while preserving their recorded levels.
- Animated connections, rotating runes, ambient canvas particles, GSAP level flashes, Framer Motion unlock cinematics, and optional synthesized sound.
- Browser-local autosave, JSON backup/export/import, progress chronicle, searchable codex, and skill-gap highlighting.
- Obsidian/gold and Moonstone/silver themes, responsive mobile layout, keyboard-focus indicators, dialog focus trapping, and reduced-motion support.

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

Next.js App Router + TypeScript, React 19, Tailwind CSS 4 with bespoke fantasy CSS, XYFlow, GSAP, Framer Motion, and the Canvas API. Static export hosting is configured in `next.config.ts` and `.openai/hosting.json`.

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

The celestial atlas and Wayfarer portrait were generated with the built-in image generation tool and optimized as WebP. See `ARTWORK.md` for exact prompts. Technology logos are bundled from Devicon v2.16.0; their license is in `public/icons/LICENSE`. Trademarks belong to their respective owners. Cinzel and DM Sans fonts are loaded through Google Fonts, with local system fallbacks.
