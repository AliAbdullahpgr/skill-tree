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
| H02 — Rating below the fold | One stepper and slider near the top, no inert duplicate, explicit unsaved state, and Save disabled when unchanged. Checked at both audit viewports. |
| H03 — Unreadable camera fits | Navigation and goal focus retain readable zoom; overview explicitly invites branch selection. Paths list every step and focus the first actionable gap rather than an anonymous whole-map fit. |
| H04 — Locked skills are a dead end | Codex rows name the first unmet ancestor and its current/required levels. Inspector requirements and full path steps open the corresponding skill. |
| H05 — Failure looks like success | Error icon, distinct red treatment, alert semantics, unchanged-data copy, and Retry import. Imports validate before updating state. |
| H06 — Storage/reset risks unclear | Local-only storage is always disclosed; Settings explains backup and erasure. Reset requires an in-app confirmation with cancellation. |
| M01 — Translucent reading surfaces | Opaque menus, inspector, skill library, history, and next-step panels. |
| M02 — Unlabelled controls/counts | Skills, History, Sound and Settings have visible mobile labels; counts retain “rated.” Navigation, camera controls, and legend have accessible names. |
| M03 — Undefined terms | Plain labels accompany Codex/Chronicle, duplicate breadcrumbs are removed, and rank/type definitions are available in the library, legend, and help. |
| M04 — Goal choice unclear | Selection indicators, a suggested goal with a reason, free exploration, a scroll cue, menu dismissal, and labelled selection feedback. All six goals exercised. |
| M05 — Next-step notation/action unclear | Consistent current/target levels, numbered suggestions, specific reasons, and separate Rate skill and Open guide actions. Guide action focuses the learning section. |
| M06 — Branch selection/menu dismissal | Current branch has a checkmark and pressed state; unexplained colour dots are removed; menu has a close button. |
| M07 — Clipped branch/node labels | Detail zoom uses the pinned area selector for orientation. Visible node captions are kept inside the board after movement and resize; camera fits reserve navigation/caption space. |
| M08 — Colour-only encoding | An on-board Legend shows labelled level swatches and examples of every marker; selected recommended skills explain their gold dot in text. |
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
