# Research synthesis

Source: the *Frontend design skill & implementation brief* (4 Nov 2026, 9 pp.), the only research document provided. It states its operating rules are recommendations, not benchmark-proven. Its cited sources (Claude Code skills/plugins docs, Anthropic's `frontend-design` skill, Playwright accessibility and snapshot docs) were not re-fetched in this build; treat the citations as the brief's claims.

## What was kept, and where it landed
| Finding | Evidence level | Capability |
|---|---|---|
| Loop: understand → direct → build → inspect → refine → hand off | Opinion, well-aligned with documented agent practice | `SKILL.md` steps 1-6 |
| Scale process to task (quick / standard / broad) | Opinion; guards against over-process | `SKILL.md` "Mode and scale" |
| ≤3 high-impact questions; offer 2 directions only when exploring or costly to reverse | Opinion | `SKILL.md` steps 1-2 |
| Design for the subject; one justified signature; ban *unjustified automatic* defaults, not treatments | Opinion; matches Anthropic's design skill | `references/design.md` |
| Compact design brief + small token system + reuse/adapt/custom | Opinion | `design.md` |
| Reference handling: borrow / avoid / fidelity; never pretend to have seen one | Opinion, strong failure-mode value | `design.md` |
| REDESIGN preservation note, baseline-first, ask before contract changes, never weaken tests | Opinion, strong failure-mode value | `references/redesign.md` |
| Browser checks at ~390/768/1440; look at screenshots; keyboard/focus/labels; outcomes not clicks | Practice; axe covers only part of a11y (Playwright docs) | `references/verify.md`, `scripts/inspect.mjs` |
| PASSED / FAILED / UNVERIFIED reporting; build-pass ≠ works | Opinion, high impact on trust | `SKILL.md` ground rules, `verify.md` gates |
| Manual invocation only (`disable-model-invocation`) | Documented skill feature | `SKILL.md` frontmatter |

## Conflicts and how they were resolved
- **Brief: "one skill, no extras" vs. mission: review mode, critique, tooling.** Kept one skill with three modes (BUILD/REDESIGN/REVIEW), one read-only critic agent, and two small tested scripts. Rationale: the brief itself allows one agent and a helper script "if genuinely useful and tested"; an independent critic reduces self-grading bias, which was the largest gap for visual quality.
- **Brief: scripts not mentioned vs. mission: deterministic workflows.** `detect-env.mjs` (capability discovery) and `inspect.mjs` (multi-viewport capture + mechanical signals) turn the most repeated, error-prone steps into one command, and degrade to explicit UNVERIFIED when Playwright is missing.
- **Brief: Playwright CLI/MCP "acceptable", no hardcoded browser tool names.** Followed: the skill prefers repo tooling, then a session browser tool, then `inspect.mjs`, then manual fallback.
- **Mission: "design system generation" as a capability vs. brief: "a small system is enough".** Followed the brief: a modest semantic-token set, no token pipeline.

## Dropped as low-value or out of scope
Tool-market comparisons, enterprise governance, multi-agent teams, mandatory CI/visual-regression/Storybook, scoring rubrics, per-route audits for tiny changes.

## Gaps (not covered by the research; handled minimally or left open)
1. **Subjective-feedback translation**: added a feedback → concrete-change table in `design.md` (author's synthesis, not research-backed).
2. **Evidence that this skill improves output quality**: none. Effectiveness needs A/B runs against no-plugin baselines (`claude plugin eval` exists; no eval suite is included yet).
3. **Figma and URL reference ingestion**: the brief says to inspect what is accessible; no Figma MCP integration was built or tested.
4. **Performance, i18n/RTL, dark mode, data-heavy dashboards**: only touched lightly.
