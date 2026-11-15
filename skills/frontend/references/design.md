# Design reference

Design for the subject, not for a generic "modern app". Identify the primary task and the information users need first; then decide composition, typography, density and emphasis. Nothing here mandates one aesthetic or framework.

## Design brief (state this in chat; a file is optional)
```
Audience + primary job:
Required screens / primary action:
Visual direction + reason:
Layout + information hierarchy:
Typography roles + spacing / density:
Surface, text, border, action, status colors:
One distinctive choice:
Mobile transformations:
Constraints + explicit non-goals:
```

## Rules that matter
- **Hierarchy**: make the primary task obvious through position, scale, contrast and grouping. Not everything gets equal weight. Squint test: can you still tell what matters?
- **Typography**: one or two families, only when justified. Assign roles (display, heading, body, label, data/mono) and tune size, weight, line height (~1.4-1.6 body) and measure (~45-75 characters). Use a modular scale; a font swap alone is not design. Prefer system or already-installed fonts unless a webfont is part of the direction; if you add one, set a fallback and avoid layout shift.
- **Spacing and composition**: pick a small rhythm (e.g. 4/8 px steps) and stick to it. Align to a consistent grid. Group by proximity before reaching for borders. Use a card only when it clarifies a boundary, not as a wrapper for everything. Intentional empty space beats filler.
- **Color**: separate brand/action colors from success, warning and error meanings. Define semantic tokens (surface, text, muted text, border, action, focus, status). Contrast: 4.5:1 for body text, 3:1 for large text and UI boundaries/focus rings. Never use color as the only signal (add icon or text).
- **Distinctiveness**: choose **one** justified signature (composition, type, imagery or a domain-specific interaction) and keep the surrounding controls understandable. Distinctive is not exotic; usability wins ties.
- **Motion**: use it to explain an action or state change (short, ~100-250 ms). No decorative reveals. Honor `prefers-reduced-motion`. Do not add an animation library for polish.
- **Content**: specific copy, realistic sample data. Test long labels, missing values, zero/one/many items, and non-English text length. No fabricated testimonials, logos or claims.
- **Avoid by default** (allowed if justified by the brief): uniform card grids, purple-blue gradient hero, glassmorphism everywhere, emoji as icons, lorem ipsum, stock-dashboard layouts, centered-everything. Do not swap one fashionable template for another. Do not ban a treatment outright; reject *unjustified automatic* use.

## A small system is enough
Keep existing tokens and components where appropriate. Otherwise define a modest set: surface/text/action/status colors, 4-6 type roles, spacing steps, radii, shadows (if any), focus style. Expose them as CSS custom properties or the project's existing theme mechanism. Reuse interaction primitives; customize composition. No token pipeline, theme switcher or component platform unless required (dark mode only if asked or the brief implies it).

**Reuse / adapt / custom decision**
| Situation | Do |
|---|---|
| Existing component does the job | Reuse as-is |
| Almost fits | Compose or extend via its supported API/variants |
| Library installed but look conflicts with the direction | Theme through tokens; build custom only for the few signature parts |
| Needs complex accessible behavior (dialog, combobox, menu, date picker) | Use a well-tested headless primitive (existing dependency first) rather than hand-rolling |
| No system exists | Define the small system above; add a library only when a present requirement justifies it |

## Interpreting references
Accept screenshots, URLs, Figma exports, sketches, logos, brand files and disliked examples. Clarify (or infer and state):
- **Borrow**: what exactly (density, type scale, color mood, layout rhythm, interaction pattern).
- **Avoid**: what not to copy, including disliked examples.
- **Fidelity**: exact (pixel-match / brand-mandated) or inspirational.
Inspect only what is actually accessible. If a URL or image cannot be opened, say so; never pretend to have seen it. A static image leaves behavior and mobile rules unspecified: decide them and state them. Copy structure and principles, not protected assets or copy.

## Turning subjective feedback into decisions
Map vague words to concrete, checkable changes, state the change, then apply it:
| Feedback | Concrete moves |
|---|---|
| "Too busy / cluttered" | Fewer type sizes and colors, remove borders in favor of spacing, collapse secondary actions, raise whitespace one step |
| "Too plain / boring" | Add one signature element: stronger type contrast, a purposeful accent, a considered layout asymmetry, domain-specific imagery or data presentation |
| "Feels cheap / generic" | Tighten alignment, reduce radius/shadow variety, improve type pairing and hierarchy, replace placeholder copy and icons |
| "More modern / premium" | Larger type contrast, generous but consistent spacing, restrained palette, subtle state transitions; avoid trend stacking |
| "Friendlier" | Warmer neutrals, rounder radii, plainer language, more helpful empty/error states |
| "More professional / trustworthy" | Calmer palette, denser aligned layout, clear data presentation, precise copy |
| "I can't find X" | Elevate X in hierarchy, rename for task language, shorten the path |
When feedback conflicts with an earlier decision, update the brief, change the affected tokens/components first, then screens. Report what you changed in one or two lines.

## Responsive transformations (not just shrinking)
Navigation → compact menu or bottom bar; multi-column → single column ordered by priority; tables → stacked rows or horizontally scrollable region with a visible affordance; side panels → sheets/pages; hover-only → tap-accessible. Touch targets ≥ 44 px on mobile (24 px is the WCAG 2.2 minimum). Use content-driven breakpoints; 390 / 768 / 1440 are inspection defaults, not standards.
