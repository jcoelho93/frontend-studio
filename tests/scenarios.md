# Scenario tests for the skill

`node tests/validate.mjs` automates structure and script checks. **The scenarios below test whether Claude behaves as the skill intends and require a human to run them in a real Claude Code session.** They have *not* been executed end to end in this repository's build session (launching a nested Claude session was blocked by the sandbox's permission policy). Record results in the table at the bottom when you run them.

Load with `claude --plugin-dir ./frontend-studio`, then invoke `/frontend-studio:frontend ...`.

| # | Scenario | Invocation | Expected behavior | Fail if |
|---|---|---|---|---|
| 1 | BUILD from a vague idea | `BUILD a personal reading tracker` | ≤3 questions or none; states a design brief; one representative slice first; add/filter flow works; empty/error states; screenshots at 390/768/1440 actually viewed; handoff report with PASSED/UNVERIFIED | Large unrequested scaffolding; claims visual check without screenshots; generic card-grid SaaS look with no stated reasoning |
| 2 | BUILD with references | `BUILD a recipe site. Use brand.png palette, density from ref.png only; avoid rounded pastel look` + attach files | States borrow / avoid / fidelity; honors the palette; does not copy beyond "density"; notes that a static image does not specify mobile/behavior | Ignores the dislike; claims to have viewed an unreadable URL |
| 3 | REDESIGN existing app | `REDESIGN Improve the recipes list and detail page. Keep routes, search behavior and saved recipes.` in a repo with an app | Writes preservation note; baseline before/after screenshots; reuses existing components/tokens; routes/search/saved re-verified | Rewrites the app/router; changes API calls; deletes tests |
| 4 | REVIEW existing implementation | `REVIEW the checkout page` | Runs the app, looks at screenshots, ranked findings with severity and smallest fix; makes **no** edits; separates verified from suspected | Findings from code reading only presented as visual verification; edits files |
| 5 | Ambiguous requirements | `BUILD a dashboard` | Asks at most three high-value questions (who, what must work, what to preserve) in one message, then proceeds on answers; does not invent the product's purpose | Asks >3 questions, asks again at every stage, or invents a domain silently |
| 6 | Unavailable browser tooling | Run in an environment without Playwright/browser | `detect-env`/`inspect.mjs` report the gap (inspect exits 2 with setup options); skill proposes install and waits for approval; continues with code checks; rendered appearance marked UNVERIFIED | Installs globally without asking; invents screenshots; reports visual PASSED |
| 7 | Quick fix | `Fix the mobile toolbar wrapping in src/Toolbar.tsx` | Inspects affected code only, smallest edit, verifies widths; no interview, no planning file | Full six-stage process for a one-line fix |
| 8 | Integration boundary | `BUILD a booking form` with no backend | Identifies mocks or asks for a contract; labels mocks in UI/report | Claims real persistence or shows fake success |
| 9 | Direction change mid-flow | After a build, say "feels too busy and cold" | Maps feedback to concrete changes (tokens first, then screens), applies, re-inspects; does not restart | Rebuilds from scratch; asks which of five options to pick |

Script-level behavior checked automatically (`tests/validate.mjs`): manifest/frontmatter/reference paths; `detect-env.mjs` stack detection; `inspect.mjs` flags overflow, unnamed controls, missing alt/lang, duplicate h1, missing focus indicators on `fixtures/bad.html`, reports clean on `fixtures/good.html`, exits 1 on unreachable URL, exits 2 with setup help when Playwright is absent.

## Results log
| Date | Scenario | Run by | Result | Notes |
|---|---|---|---|---|
| | | | | |
