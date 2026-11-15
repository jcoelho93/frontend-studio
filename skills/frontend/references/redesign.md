# REDESIGN and REVIEW reference

Start from the actual application and the requested problems. Scale to the requested area, not the whole repository. Do not rewrite an app because it is easier; do not migrate router, state, forms, data layer or framework unless asked.

## 1. Reconnaissance (affected area only)
1. Read repo instructions (README, CLAUDE.md, contributing). Run `scripts/detect-env.mjs`.
2. Find affected routes/screens, the shared components and styles they use, and how data flows (fetch, mutations, validation, auth, persistence, query params).
3. Run the app if possible and look at the affected screens before changing anything. Capture "before" screenshots (`scripts/inspect.mjs <url> --out before/`) so changes can be compared and honestly reported.
4. Note existing tokens, theme mechanism, component library and conventions. Reuse them unless you have a concrete reason not to.
5. Identify weaknesses worth fixing, ranked by user impact: broken or confusing flow > accessibility > mobile > hierarchy/consistency > polish. Include design debt you intend to fix, and name what you are leaving alone.

## 2. Preservation note (keep it small)
```
Must remain unchanged:
- [affected route / behavior / data contract]
Intentional change:
- [approved UX or visual change]
Verification:
- [before / after check of the affected flow]
```
Preserve: routes, deep links, query parameters, back/refresh behavior, data requests, mutations, validation, persistence, permissions, critical interactions, and reuse existing components and styling architecture.

## 3. Separate kinds of change
Classify each change as **visual**, **interaction**, **functional** or **architectural**. Visual changes proceed. Interaction changes proceed if they are within the brief. **Ask before** changing: API/data contracts, auth/permissions, destructive behavior, routing structure, the framework or styling architecture, or deleting features.

## 4. Baseline, then incremental edits
- Baseline the affected flows first (what works today, including pre-existing failures: run existing tests and record results *before* editing).
- Change shared tokens/components carefully (they fan out). Validate **one route first**, then migrate the rest.
- After each meaningful change, re-verify the preserved flow. Prefer several small verified edits over one large rewrite.
- Keep the diff reviewable: do not reformat unrelated files.

## 5. Handling test and screenshot differences
- Record pre-existing failures separately from new regressions.
- Never delete or weaken a test, and never accept a changed snapshot solely to hide a difference.
- If a snapshot differs: confirm it is an *intended* visual change, say why, then update it deliberately. Unintended differences are bugs.

## 6. REVIEW mode (assess, change only if asked)
Produce a ranked findings list from running the app and inspecting screenshots, not from reading code alone. For each finding: where (route/component), what is wrong, why it matters to users, the smallest fix, and severity (blocker / major / minor). Separate verified findings from suspicions. Cover: hierarchy and composition, typography, spacing, color/contrast, responsive behavior, states, interaction, keyboard/focus/labels, copy. If the user then asks for changes, switch to REDESIGN steps 2-6 for the chosen findings only. For an independent second opinion on screenshots, use the `design-critic` agent when available.

## 7. Done when
Affected flows behave as before (or as intentionally changed), the before/after is visible in screenshots you actually looked at, existing checks are no worse than baseline, and the report lists what was and was not verified.
