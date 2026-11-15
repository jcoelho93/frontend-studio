# Verification reference

Goal: evidence about the *rendered* interface. The skill is instructions; it cannot install or expose tools. Use whatever reliably provides: start the app, navigate, interact, capture screenshots, read them, run existing checks.

## 1. Capability discovery
1. `node ${CLAUDE_SKILL_DIR}/scripts/detect-env.mjs .` → stack, scripts, Playwright/axe/browser presence. File presence is a hint, not proof a browser launches.
2. Check this session's tools for a browser MCP or built-in browser, and whether a Playwright CLI is on the PATH. Prefer, in order: repo's existing browser tooling → a browser tool already exposed in the session → `scripts/inspect.mjs` (needs the `playwright` module and a browser) → manual fallback.
3. Missing tool? **Propose** the install command and get approval. Do not bypass permissions or add a remote service.
   - `npm i -D playwright && npx playwright install chromium` (browser for `inspect.mjs`)
   - `npm i -D @axe-core/playwright` (optional automated a11y scan)

## 2. Launch
Use the repo's own `dev`/`start`/`preview` script from `detect-env.mjs`; don't invent scripts. Run it in the background, wait for the port, and use a test account/seed data, never production. Static page: open the file directly (`inspect.mjs path/to/index.html` accepts file paths).

## 3. Inspection recipe
1. **Capture**: `node ${CLAUDE_SKILL_DIR}/scripts/inspect.mjs http://localhost:PORT/route --out .frontend-inspect/route [--full-page]` → `w390.png`, `w768.png`, `w1440.png` and `report.json`. (Or the equivalent via your browser tool.) Add `.frontend-inspect/` to the ignore list or delete it afterwards; don't commit screenshots unless asked.
2. **Look** at each screenshot with the Read tool. Judge in this order: hierarchy and composition → type and density → alignment and grouping → color and contrast → wrapping, overflow, clipped controls, awkward empty space → consistency. Mobile must *transform*, not just shrink.
3. **Drive the primary journey** with the browser tool or a Playwright script: perform the main task end to end and at least one invalid/error/empty state. Confirm **outcomes**: navigation reaches the right destination, saves persist as specified, filters change the content, bad input yields useful feedback, success is visible.
4. **Keyboard and focus**: Tab through the page: logical order, visible focus, no traps, Esc closes overlays, focus moves into and returns from dialogs, Enter/Space activate controls.
5. **Names and labels**: every control and image has an accessible name; form fields have labels; errors are associated with fields and announced; status isn't conveyed by color alone.
6. **Contrast / motion**: spot-check text and UI contrast (4.5:1 / 3:1); verify reduced-motion behavior if you added motion.
7. `report.json` signals (overflow, console errors, failed requests, small targets, unnamed controls, focus indicators) are **mechanical hints**. A clean report is not a pass on design or accessibility; a signal may be a false positive (check it).

## 4. Defaults, optional extras
- Widths: ~390 (phone), ~768 (tablet), ~1440 (desktop). Add others if the layout breaks between them.
- **Durable tests**: add a few Playwright tests for critical repeatable interactions when justified; for a tiny static page, inspection plus existing build/lint is proportionate.
- **Optional**: axe (partial coverage only; manual checks remain necessary), Chrome DevTools for hard diagnostics, Lighthouse for a specific performance concern, visual-regression snapshots (stabilize content and environment; review new baselines; rendering differs across machines). Storybook, hosted visual regression and Figma MCP are never prerequisites.

## 5. Code health
Run existing build/type/lint/test commands relevant to the change. Do not invent scripts. Record baseline failures before editing (REDESIGN).

## 6. Quality gates (a change is not "done" until each is PASSED, or UNVERIFIED/NOT APPLICABLE with a reason)
| Gate | Passed means |
|---|---|
| Code health | Relevant existing build/type/lint/tests pass or failures are pre-existing and listed |
| Behavior | Primary journey and ≥1 invalid/error/empty state exercised with confirmed outcomes |
| Responsive | 390/768/1440 screenshots looked at; no overflow, clipping or broken layout; mobile transforms |
| Visual | Hierarchy, type, spacing, contrast, consistency judged from screenshots |
| Accessibility | Keyboard path, focus, names/labels, errors, contrast checked (+axe if available) |
| Preservation (REDESIGN) | Flows listed in the preservation note re-verified |
A failing gate is FAILED until fixed. Never relabel it PASSED to finish.

## 7. If a tool is unavailable
Continue with available checks. Mark rendered appearance and interaction that you could not inspect **UNVERIFIED**; say exactly what is missing and how to enable it; ask the user for screenshots if useful. Never invent screenshots or imply you saw the UI.

## 8. Final report template
```
Changed: …
Design choices: …
Unchanged / preserved: …
Checks:  Code health PASSED|FAILED|UNVERIFIED|N/A — <command + result>
         Behavior … | Responsive (390/768/1440) … | Visual … | Accessibility … | Preservation …
Real vs mocked: …
Remaining issues / limitations: …
Run it: <command>
```
