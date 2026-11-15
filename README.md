# frontend-studio

A Claude Code plugin that makes Claude design, build, redesign and review frontends deliberately, and **verify them in a real browser** instead of declaring success because the build passed.

One skill, three modes, one optional critic agent, two small helper scripts. No hooks, no MCP server, no framework scaffolder, no orchestrator.

```
frontend-studio/
├── .claude-plugin/plugin.json
├── skills/frontend/
│   ├── SKILL.md                    # the workflow (concise, always loaded when invoked)
│   ├── references/design.md        # design brief, rules, references, feedback translation
│   ├── references/redesign.md      # preservation, baselines, REVIEW findings
│   ├── references/verify.md        # browser recipe, quality gates, report template
│   └── scripts/{detect-env,inspect}.mjs
├── agents/design-critic.md         # independent, read-only critique
├── docs/research-synthesis.md
└── tests/{validate.mjs,scenarios.md,fixtures/}
```

## Modes
| Mode | Use when | Starts from |
|---|---|---|
| `BUILD` | New frontend | Product goal and required tasks; one representative slice first, then extend |
| `REDESIGN` | Improve an existing app | The running app; a preservation note and baseline before any change |
| `REVIEW` | Assess without changing | Rendered screenshots; ranked findings with smallest fixes |

Core loop: **understand → direct → build → inspect in the browser → refine → hand off.** Process scales with the task: quick fix, standard, or broad. At most three clarifying questions, asked only if they change the result. Two alternative directions only when you ask to explore or the choice is expensive to reverse. You can change direction at any time without restarting.

## Install
From the marketplace hosted in this repo:
```
/plugin marketplace add jcoelho93/frontend-studio
/plugin install frontend-studio@jcoelho-plugins
```
Update later with `/plugin marketplace update jcoelho-plugins`. Bump `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, then tag `vX.Y.Z` to release.

For local development:
Requires Claude Code with plugin support (developed against 2.1.318). Node 18+ for the scripts.

```bash
# Try it for one session (from the folder that contains frontend-studio/)
claude --plugin-dir ./frontend-studio
```
Then invoke `/frontend-studio:frontend ...`. Check the structure with:
```bash
claude plugin validate ./frontend-studio
node frontend-studio/tests/validate.mjs
```
**Standalone skill (no plugin):** copy `skills/frontend/` to `.claude/skills/frontend/` (project) or `~/.claude/skills/frontend/` (personal) and invoke `/frontend`. Don't load both forms. The `design-critic` agent is plugin-only; the skill works without it. To remove the plugin, stop passing `--plugin-dir` (or `claude plugin uninstall` if you installed it from a marketplace). 

The skill is **manual-only** (`disable-model-invocation: true`) so it never launches unexpectedly.

## Usage
```text
# BUILD from a vague idea
/frontend-studio:frontend BUILD a personal reading tracker

# BUILD with direction
/frontend-studio:frontend BUILD a landing page for a small bakery. Warm, editorial, no stock photos. Brand colors #7a2e1d and #f4ead7. Dislikes: purple gradients. Static HTML/CSS is fine.

# REDESIGN, preserving behavior
/frontend-studio:frontend REDESIGN Improve the recipes list and detail page.
Keep existing routes, search behavior and saved recipes.
Use the attached screenshot for density and typography only.

# REVIEW without changing code
/frontend-studio:frontend REVIEW the checkout flow at localhost:3000/checkout

# Quick fix (no interview)
/frontend-studio:frontend Fix the mobile toolbar wrapping in src/Toolbar.tsx

# Steer mid-way
"Feels too busy and cold." -> mapped to concrete token/layout changes and re-inspected.
```

## Giving visual direction
Attach screenshots, paste URLs, Figma exports, logos, brand palettes, and **disliked examples**. Say what to borrow (density, type, color mood, layout rhythm), what to avoid, and how exact it must be (pixel-match vs. inspiration). Claude inspects only what it can actually open and will say so if it can't. A static image doesn't define mobile or interactive behavior; Claude will decide and state those. Subjective feedback ("more premium", "too plain") is translated into concrete changes (table in `references/design.md`).

## Browser verification
Order of preference: your repo's existing browser tooling → a browser tool already exposed in the session (browser MCP, Playwright CLI) → the bundled `scripts/inspect.mjs` → manual fallback.

```bash
node frontend-studio/skills/frontend/scripts/detect-env.mjs .     # stack, scripts, browser tooling (JSON)
node frontend-studio/skills/frontend/scripts/inspect.mjs http://localhost:5173 --out .frontend-inspect/home
node .../inspect.mjs path/to/index.html --widths 390,1440 --full-page --no-axe
```
`inspect.mjs` writes `w390.png`/`w768.png`/`w1440.png` and `report.json`, and prints mechanical signals: horizontal overflow, console errors, failed requests, small tap targets, unnamed controls, missing alt/lang/viewport/`<main>`, heading count, missing focus indicators, plus axe results if `@axe-core/playwright` is installed. **These are hints, not a verdict**; Claude must still look at the screenshots.

Setup (ask-first; the skill never installs on its own): `npm i -D playwright && npx playwright install chromium`, optionally `npm i -D @axe-core/playwright`. Exit code 2 means tooling unavailable, and the skill then reports rendered appearance as **UNVERIFIED**.

Quality gates (code health, behavior, responsive, visual, accessibility, and preservation for REDESIGN) are in `references/verify.md`. Each ends as PASSED / FAILED / UNVERIFIED / NOT APPLICABLE. A failing gate is never relabeled as a pass.

## design-critic agent
Read-only reviewer (`Read, Glob, Grep, Bash`) that critiques screenshots against the brief and returns ranked findings. Ask for it after a build ("have the design-critic review these screenshots") for a judgment not biased by having built the UI.

## Customizing
- Edit the design rules, anti-defaults and feedback table in `references/design.md`.
- Change default widths via `--widths`, or in `verify.md`.
- Add project rules (brand, component conventions) to your repo's `CLAUDE.md`; the skill follows repository instructions first.
- Add a house style by extending `design.md` rather than the main `SKILL.md`, which should stay short.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `/frontend-studio:frontend` not found | Start Claude with `--plugin-dir ./frontend-studio` (path must contain `.claude-plugin/`); `/help` should list it |
| `inspect.mjs` exits 2 | Playwright module or browser missing; follow the printed options or use a session browser tool |
| Page loads but screenshots look unstyled / empty | Dev server not ready; wait for the port, or the app needs auth/seed data (use test data, never production) |
| `no mechanical issues` but design looks wrong | Expected: the script can't judge design. Look at the screenshots |
| Mobile (390) shows no overflow but page lacks viewport meta | Without `<meta name=viewport>` mobile emulation lays out at ~980px; fix the meta first |
| Claude asks too many questions | Give audience, primary task and constraints up front; the skill caps itself at three |

## Validation status
- Automated and passing: `claude plugin validate` (warning: no icon, which only matters for directory submission) and `node tests/validate.mjs` (structure, frontmatter, reference paths, script behavior against fixtures).
- **Not yet executed:** the nine behavioral scenarios in `tests/scenarios.md`; they need a real interactive Claude Code session. No claim is made yet that the plugin improves output quality; see `docs/research-synthesis.md` for gaps.

## Limitations
No Figma/URL ingestion beyond what Claude's session tools can open; `inspect.mjs` checks one URL, uses Chromium only, and its focus check is heuristic; no visual-regression baselines are managed; MIT licensed.
