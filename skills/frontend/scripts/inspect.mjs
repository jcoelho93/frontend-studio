#!/usr/bin/env node
// Capture screenshots at several viewports and collect objective signals for a page.
//
// Usage: node inspect.mjs <url|file path> [--out DIR] [--widths 390,768,1440] [--full-page] [--no-axe]
// Exit codes: 0 ran (findings are signals, not a verdict) | 2 tooling unavailable | 1 bad usage / page unreachable
//
// This does NOT replace looking at the screenshots. It finds mechanical problems (overflow,
// console errors, unlabeled controls, small tap targets, missing focus styles); it cannot judge design quality.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const target = args.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--out', '--widths'].includes(args[i - 1])));
if (!target) {
  console.error('Usage: node inspect.mjs <url|file path> [--out DIR] [--widths 390,768,1440] [--full-page] [--no-axe]');
  process.exit(1);
}
const url = /^[a-z][a-z0-9+.-]*:/i.test(target) ? target : pathToFileURL(path.resolve(target)).href;
const outDir = path.resolve(opt('--out', 'frontend-inspect'));
const widths = opt('--widths', '390,768,1440').split(',').map(Number).filter((n) => n >= 200 && n <= 4000);
const heightFor = (w) => (w <= 500 ? 844 : w <= 1000 ? 1024 : 900);

function load(mod) {
  for (const base of [path.join(process.cwd(), 'noop.js'), import.meta.url]) {
    try { return createRequire(base)(mod); } catch { /* next */ }
  }
  return null;
}

const setupHelp = `
Browser inspection unavailable. Options (ask the user before installing anything):
  1. Use a browser tool already exposed in this session (browser MCP, Playwright CLI) instead of this script.
  2. In the project:  npm i -D playwright && npx playwright install chromium
  3. Skip tooling: report rendered appearance and interaction as UNVERIFIED and ask the user for screenshots.`;

const pw = load('playwright');
if (!pw) { console.error('Playwright module not found.' + setupHelp); process.exit(2); }

let browser;
try { browser = await pw.chromium.launch(); } catch (e1) {
  try { browser = await pw.chromium.launch({ channel: 'chrome' }); } catch {
    console.error(`Could not launch a browser: ${String(e1.message).split('\n')[0]}` + setupHelp);
    process.exit(2);
  }
}

// Runs inside the page. Returns mechanical signals only.
function pageProbe() {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = (el) => {
    const id = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    return (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || id
      || (el.textContent || '').trim() || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('value') || '');
  };
  const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;

  const overflowing = [...document.querySelectorAll('body *')].filter((el) => {
    if (!visible(el)) return false; const r = el.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1;
  }).slice(0, 8).map(desc);

  const interactive = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[tabindex]:not([tabindex="-1"])')].filter(visible);
  const smallTargets = interactive.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; })
    .slice(0, 8).map((el) => `${desc(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
  const unnamed = interactive.filter((el) => !label(el)).slice(0, 8).map(desc);
  const imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).slice(0, 8).map((i) => i.getAttribute('src') || 'img');
  const tinyText = [...document.querySelectorAll('body *')].filter((el) => visible(el)
    && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).length;

  return {
    title: document.title,
    lang: document.documentElement.lang || null,
    viewportMeta: Boolean(document.querySelector('meta[name=viewport]')),
    h1Count: document.querySelectorAll('h1').length,
    landmarks: { main: document.querySelectorAll('main,[role=main]').length, nav: document.querySelectorAll('nav,[role=navigation]').length },
    horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
    scrollWidth: document.documentElement.scrollWidth, clientWidth: vw,
    overflowingElements: overflowing, smallTargets, unnamedControls: unnamed, imagesMissingAlt: imgsNoAlt,
    textBelow12px: tinyText, interactiveCount: interactive.length,
  };
}

// Tab through the page; for each focused element check for a visible focus indicator.
async function focusPass(page, max = 25) {
  const seen = []; const noIndicator = [];
  await page.evaluate(() => document.activeElement?.blur());
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const shadow = s.boxShadow && s.boxShadow !== 'none';
      const tag = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`;
      return { tag, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), indicator: outline || shadow, key: tag + '|' + (el.textContent || '').trim().slice(0, 30) };
    });
    if (!info) break;
    if (seen.includes(info.key)) break; // wrapped around
    seen.push(info.key);
    if (!info.indicator) noIndicator.push(`${info.tag} "${info.text}"`);
  }
  return { tabStopsVisited: seen.length, withoutObviousFocusIndicator: noIndicator,
    caveat: 'Heuristic: checks outline/box-shadow only; border or background-only focus styles may be false positives.' };
}

fs.mkdirSync(outDir, { recursive: true });
const report = { url, generatedBy: 'inspect.mjs', viewports: [], axe: null, notes: [] };
let reachable = true;

for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 1, isMobile: w <= 500, hasTouch: w <= 500 });
  const page = await ctx.newPage();
  const consoleErrors = []; const failedRequests = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e.message).slice(0, 200)));
  page.on('requestfailed', (r) => failedRequests.push(`${r.url().slice(0, 120)} (${r.failure()?.errorText})`));
  page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url().slice(0, 120)}`); });
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    if (resp && resp.status() >= 400) report.notes.push(`Main document returned HTTP ${resp.status()}`);
    const file = path.join(outDir, `w${w}.png`);
    await page.screenshot({ path: file, fullPage: flag('--full-page') });
    const v = { width: w, height: heightFor(w), screenshot: file, ...(await page.evaluate(pageProbe)), consoleErrors, failedRequests };
    if (w === widths[widths.length - 1] || widths.length === 1) v.keyboard = await focusPass(page);
    report.viewports.push(v);
    if (!flag('--no-axe') && w === widths[widths.length - 1] && !report.axe) {
      const axeMod = load('@axe-core/playwright');
      if (axeMod) {
        const AxeBuilder = axeMod.default || axeMod.AxeBuilder || axeMod;
        const res = await new AxeBuilder({ page }).analyze();
        report.axe = { violations: res.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.length })) };
      } else report.axe = { skipped: '@axe-core/playwright not installed; axe NOT run. Manual a11y checks still required.' };
    }
  } catch (e) {
    reachable = false;
    report.notes.push(`Width ${w}: could not load page: ${String(e.message).split('\n')[0]}`);
  }
  await ctx.close();
}
await browser.close();

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

// Human summary
const lines = [`Inspected ${url}`, `Screenshots + report.json in ${outDir}`, ''];
for (const v of report.viewports) {
  const issues = [];
  if (v.horizontalOverflow) issues.push(`horizontal overflow (${v.scrollWidth}px > ${v.clientWidth}px): ${v.overflowingElements.join(', ')}`);
  if (v.consoleErrors.length) issues.push(`${v.consoleErrors.length} console error(s): ${v.consoleErrors[0]}`);
  if (v.failedRequests.length) issues.push(`${v.failedRequests.length} failed/4xx+ request(s): ${v.failedRequests[0]}`);
  if (v.smallTargets.length) issues.push(`${v.smallTargets.length} tap target(s) under 24px: ${v.smallTargets.slice(0, 3).join('; ')}`);
  if (v.unnamedControls.length) issues.push(`${v.unnamedControls.length} control(s) with no accessible name: ${v.unnamedControls.slice(0, 3).join(', ')}`);
  if (v.imagesMissingAlt.length) issues.push(`${v.imagesMissingAlt.length} image(s) without alt attribute`);
  if (v.textBelow12px) issues.push(`${v.textBelow12px} text element(s) below 12px`);
  if (!v.viewportMeta) issues.push('no viewport meta');
  if (!v.lang) issues.push('no <html lang>');
  if (v.h1Count !== 1) issues.push(`${v.h1Count} <h1> elements`);
  if (!v.landmarks.main) issues.push('no <main> landmark');
  if (v.keyboard?.withoutObviousFocusIndicator.length) issues.push(`no obvious focus indicator on: ${v.keyboard.withoutObviousFocusIndicator.slice(0, 3).join(', ')}`);
  lines.push(`[${v.width}px] ${issues.length ? 'signals:\n  - ' + issues.join('\n  - ') : 'no mechanical issues detected'}`);
}
if (report.axe?.violations) lines.push('', `axe: ${report.axe.violations.length} violation type(s)` + report.axe.violations.map((x) => `\n  - ${x.id} (${x.impact}) x${x.nodes}`).join(''));
if (report.axe?.skipped) lines.push('', 'axe: ' + report.axe.skipped);
if (report.notes.length) lines.push('', ...report.notes.map((n) => 'NOTE: ' + n));
lines.push('', 'These are mechanical signals. Open the screenshots and judge hierarchy, type, spacing and composition yourself.');
console.log(lines.join('\n'));
process.exit(reachable && report.viewports.length ? 0 : 1);
