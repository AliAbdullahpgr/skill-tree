# UX audit completion

This continues the original first-user audit in `.ux-audit/FINDINGS.md` and the
four UX commits on `experiment` after `dfa7fa1`. The original audit and screenshots
are local, ignored artifacts. This document preserves the resolution checklist in
the repository.

The original audit covered 29 findings (6 high, 14 medium, 9 low) at 390×844 and
1440×900. All 29 have implementation changes, with the flows below verified
against the production static export in Chromium.

| Finding | Resolution |
| --- | --- |
| H01 — Demo mistaken for personal data | Persistent demo badge and banner, demo labels in the inspector, repeated demo context in search, and a labelled reset action. |
| H02 — Rating below the fold | Five fillable proficiency stars stay near the top of the card and save immediately. Clear resets to unrated. There is no inert duplicate, slider, or separate Save action. |
| H03 — Unreadable camera fits | Navigation and goal focus retain readable zoom; overview explicitly invites branch selection. Paths list every step and focus the first actionable gap rather than an anonymous whole-map fit. |
| H04 — Locked skills are a dead end | Codex rows name the first unmet ancestor and its current/required levels. Inspector requirements and full path steps open the corresponding skill. |
| H05 — Failure looks like success | Error icon, distinct red treatment, alert semantics, unchanged-data copy, and Retry import. Imports validate before updating state. |
| H06 — Storage/reset risks unclear | Local-only storage is always disclosed; Settings explains backup and erasure. Reset requires an in-app confirmation with cancellation. |
| M01 — Translucent reading surfaces | Opaque menus, inspector, skill library, history, and next-step panels. |
| M02 — Unlabelled controls/counts | Skills, History, Sound and Settings have visible mobile labels; counts retain “rated.” Navigation, camera controls, and legend have accessible names. |
| M03 — Undefined terms | Plain labels accompany Codex/Chronicle, duplicate breadcrumbs are removed, and rank/type definitions are available in the library, legend, and help. |
| M04 — Goal choice unclear | Selection indicators, a suggested goal with a reason, free exploration, a scroll cue, menu dismissal, and labelled selection feedback. All six goals exercised. |
| M05 — Next-step notation/action unclear | Consistent current/target star ratings, numbered suggestions, specific reasons, and separate Rate skill and Open guide actions. Guide action focuses the learning section. |
| M06 — Branch selection/menu dismissal | Current branch has a checkmark and pressed state; unexplained colour dots are removed; menu has a close button. |
| M07 — Clipped branch/node labels | Detail zoom uses the pinned area selector for orientation. Visible node captions are kept inside the board after movement and resize; camera fits reserve navigation/caption space. |
| M08 — Colour-only encoding | An on-board Legend shows labelled level swatches and explains every marker, including suggested-skill gold dots. |
| M09 — Sample chronicle ambiguity | History explicitly identifies the demo profile and EXAMPLE entries, distinguishes new saves, and explains how reset clears both. Notifications occupy a separate layout row. |
| M10 — Inconsistent totals | Overall and branch counts exclude the structural Engineering root: 227 rateable skills, 15 initially rated. Goal counts say “targets” and explain prerequisite inclusion. |
| M11 — Prose-only help/offscreen dismissal | Three numbered steps and visual level/marker keys; the Back to the board action stays outside the scrolling help body. |
| M12 — Floating controls obscure content | Goal control is hidden while inspector/library/modal is open. A separate dock reserves space outside the interactive board. |
| M13 — Search/codex affordances | Row chevrons, result counts, clear-query controls, contextual empty states and clear-filter recovery. |
| M14 — Theme/sound controls unclear | Theme previews and descriptions, a more visible Moonstone treatment, and a labelled Sound effects switch with explicit state. |
| L01 — Singular prerequisite grammar | Singular and plural forms corrected. |
| L02 — Timestamp wrapping | Short dates/times with no wrapping; full timestamp retained in the title. |
| L03 — Unlabelled deficits | Requirements state levels short/current/required. |
| L04 — Saved locked level unclear | Codex explicitly says “Saved level N preserved,” alongside the unmet requirement. |
| L05 — Search hides demo explanation | Search repeats the demo-profile label above results. |
| L06 — Empty searches have no recovery | Board and library searches explain the miss and offer clear/reset actions. |
| L07 — Initial desktop edge labels clipped | Initial fit adjusted and visible captions constrained at board edges. |
| L08 — Vocabulary drift | Consistent goal/level/rated/available/reset labels, with plain Skills and History destinations beside the themed names. |
| L09 — Narrow-window search shortcut fails | `/` opens search and focuses the input at both audit widths. |

Additional fixes found while completing the audit:

- Removed the unsupported SVG `title` prop that broke TypeScript.
- Connected the unfinished goal suggestion helper, excluding the shared structural
  root and considering partial practice so fresh profiles do not default to DevOps.
- Preserved demo status and theme on backup round trips; safely discard null or
  invalid history entries without partially applying a rejected import.
- Kept unlock dialogs open until dismissed so their contents can be read.
- Updated the earlier browser checks for the current controls and added
  `scripts/ux-audit-check.mjs` for the audited stories.

## Verification

Build a static export with `npm run build`, serve `out/` on port 3091 with proper
404 handling, and run:

```text
npm test
npm run typecheck
node scripts/browser-check.mjs
node scripts/priorities-check.mjs
node scripts/ux-audit-check.mjs
```

The browser scripts accept `TEST_URL` and `CHROMIUM_PATH`. Set `CHROMIUM_PATH` if
the installed Chromium revision differs from the project's Playwright default.

Coverage includes both audit viewports, all ten branch shortcuts, all six goals,
direct learning-guide access, the rating editor, retained prerequisite targets,
saving/unlocking, persistence, backup export/import, rejected imports, reset
cancel/confirm, history empty/sample states, visual legends, settings, overview
navigation, keyboard search, and the exported 404/return route. Extra layout
captures cover widths 320, 360, 700, and 768. The audit flow uses reduced motion;
the original browser smoke check exercises animated navigation and unlocks.

Before/after screenshots remain local in `.ux-audit/` and
`.artifacts/ux-fixed/`. Browser checks assert no page errors. Physical touch/pinch,
actual speaker output, screen-reader output, measured contrast, and other browser
engines were not verified.

## Card layout follow-up

The skill card now prioritizes short, clickable prerequisite rows and the full roadmap.sh learning content. Repeated status blocks, warnings, breadcrumbs, and the large path footer were removed. The five-star proficiency control is compact and immediately available; assessment guidance and the complete dependency chain remain in expandable sections. All existing roadmap descriptions, resource titles, types, URLs, and full-roadmap links are retained. Browser checks cover the new disclosures and compare displayed learning content against the local source data.

## Five-star follow-up

The 0–10 level interface has been replaced across the card, board, library,
history, prerequisite paths, goals, suggestions, legend, and help. Five whole
stars represent learning basics, simple tasks, independent work, complex work,
and teaching others. Ratings save on selection, with pointer preview, keyboard
navigation, and a Clear action. Roadmap descriptions and all resource links are
unchanged.

Version-1 progress and history migrate with the same bands as source requirements
and goals: 1–2 → 1 star, 3–4 → 2, 5–6 → 3, 7–8 → 4, 9–10 → 5; zero remains unrated.
Version-2 saves declare `ratingScale: 5` and are not converted again. Legacy browser
keys remain intact. Verification includes 29 unit tests and
`scripts/stars-check.mjs` alongside the three earlier browser scripts.

## Desktop audit follow-up (2026-11-08)

A second first-time-user pass at 1440×900 (checked at 1280 and 1920) found 27 issues: 1 High, 12 Medium and 14 Low.
Three of them were findings T01–T03 from the earlier partial pass. All 27 now have fixes.

| Finding | Resolution |
| --- | --- |
| D01 — Clearing the Engineering root locked all 213 skills | The root is structural. It is always satisfied, can't be rated or selected, and isn't drawn. Saves that cleared it are repaired on load. |
| D02 / T03 — "Requirements met" next to "Focus first unmet step" | The pill says "Focus first step: X", or "Focus React" when every step is met. The steps panel says "All prerequisites met". Visible and accessible labels now match. |
| D03 / T01 — Next target 1★ while the card said goal 2★ | Next steps shows "next unlock 1 star · goal 2 stars". The card shows "Goal target" inside the rating box. |
| D04 / T02 — Codex/Chronicle naming | The buttons, headings, help, reset confirmation and filter labels all say Skills, Skill library and History. |
| D05 — Library and card named different blockers | Both name the direct prerequisite and the first actionable step. Locked cards explain why they can't be rated. |
| D06 — Engineering realm opened on a lone root node | Choosing Engineering opens the branch-card overview. |
| D07 — Branch fit cut off rows and let neighbours bleed in | The fit covers the whole branch: desktop minimum zoom is 42%, with tighter insets. Skills from other branches are faded. Captions wrap at 140px. |
| D08 — Path lines ran to the hidden root or through unrelated nodes | Root edges are never drawn. Lines that would pass through another skill arc around it. |
| D09 — Celebration named a side unlock, late and in RPG copy | All unlocks are listed in one notification, with the path's skills first. The full-screen moment is only for the skill being pursued (or a goal milestone). It appears immediately, with plain copy and Rate / Not now actions. |
| D10 — A fresh profile showed "2 rated" | Reset leaves every skill unrated (0 / 227). Next steps says "Start here" until something is rated. |
| D11 / D12 — Unexplained fading; mystery crosshair | The legend has a Highlights section. A "Show all skills" hint appears when a goal fades the whole view. Gaps has a visible label, an amber dashed outline and a counted explanation. |
| D13 — Experts had to rate every ancestor first | Locked cards offer "I already know X". After confirmation, unmet prerequisites are set to their minimum and recorded in History. |
| D14–D27 (Low) | Fixed: plural counts, history entries with no change removed and history rows clickable, the expanded path scrolls into view, the path pill links back to the card, zoom controls stay visible beside the card, search shows locks, branch subheadings in the library, a wider goal menu, Reset demo jumps to the reset section, the 404 uses the saved theme, the sound preference persists, a correct screen-reader node description, prerequisite rows read "You 3/5 · needs 2/5", and a note when a skill has no guide. |

At the user's request, demo data is flagged in one place only: the "Demo data" chip in the header, which opens Settings at the reset section. The board banner, the search-results line, the per-card tag and the History note are removed. Sample entries keep their small "Example" tags.

Verification: `npm test` (33 tests), `npm run typecheck`, and the four browser scripts (`browser-check`, `priorities-check`, `ux-audit-check`, `stars-check`) against the static export served with a real 404. The scripts were updated where behaviour changed on purpose: 227 drawn nodes, no root edges, Skills/History labels, side unlocks announced in the notification, a desktop branch-fit minimum of 42%, and locked skills opening with their path expanded.
