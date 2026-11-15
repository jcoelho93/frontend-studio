#!/usr/bin/env node
// Structural + script checks for the plugin. Run: node tests/validate.mjs
// Proves structure and script behavior only; it does NOT prove design effectiveness.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(root, 'skills/frontend');
let failed = 0, skipped = 0;
const ok = (name, cond, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ' - ' + detail : ''}`); if (!cond) failed++; };
const skip = (name, why) => { console.log(`SKIP  ${name} - ${why}`); skipped++; };

function frontmatter(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const out = {}; let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; out[key] = kv[2].replace(/^>-?$/, '').trim(); }
    else if (key && /^\s+/.test(line)) out[key] = (out[key] + ' ' + line.trim()).trim();
  }
  return out;
}

// Manifest
let manifest = null;
try { manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8')); } catch (e) { /* reported below */ }
ok('plugin.json is valid JSON', !!manifest);
ok('manifest name is kebab-case', /^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest?.name || ''));
ok('manifest has semver version', /^\d+\.\d+\.\d+/.test(manifest?.version || ''));
ok('component dirs sit beside .claude-plugin, not inside', !fs.existsSync(path.join(root, '.claude-plugin/skills')) && fs.existsSync(skillDir));

// Skill
const skillFile = path.join(skillDir, 'SKILL.md');
const fm = frontmatter(skillFile);
ok('SKILL.md has frontmatter', !!fm);
ok('skill name matches directory', fm?.name === path.basename(skillDir));
ok('skill description present and <= 1024 chars', !!fm?.description && fm.description.length <= 1024);
ok('skill is manual-invocation only', fm?.['disable-model-invocation'] === 'true');
ok('skill declares argument-hint', !!fm?.['argument-hint']);
const body = fs.readFileSync(skillFile, 'utf8');
ok('SKILL.md stays concise (< 130 lines)', body.split('\n').length < 130, `${body.split('\n').length} lines`);

// Every bundled file referenced from SKILL.md / references exists
const refd = new Set();
for (const f of [skillFile, ...fs.readdirSync(path.join(skillDir, 'references')).map((x) => path.join(skillDir, 'references', x))]) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/(?:\$\{CLAUDE_SKILL_DIR\}\/)?((?:references|scripts)\/[\w.-]+\.(?:md|mjs))/g)) refd.add(m[1]);
}
for (const r of refd) ok(`referenced file exists: ${r}`, fs.existsSync(path.join(skillDir, r)));
ok('three reference files present', ['design.md', 'redesign.md', 'verify.md'].every((f) => fs.existsSync(path.join(skillDir, 'references', f))));

// Agent
const agentFile = path.join(root, 'agents/design-critic.md');
const afm = frontmatter(agentFile);
ok('agent has name + description', afm?.name === 'design-critic' && !!afm?.description);
ok('agent is read-only (no Edit/Write tools)', !/\b(Edit|Write)\b/.test(afm?.tools || ''));

// Scripts
const node = process.execPath;
const det = path.join(skillDir, 'scripts/detect-env.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-test-'));
fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ dependencies: { react: '18', tailwindcss: '3' }, devDependencies: { vite: '5' }, scripts: { dev: 'vite', build: 'vite build' } }));
fs.writeFileSync(path.join(tmp, 'pnpm-lock.yaml'), '');
try {
  const r = JSON.parse(execFileSync(node, [det, tmp], { encoding: 'utf8' }));
  ok('detect-env: framework, styling, package manager, scripts', r.frameworks.includes('React') && r.styling.includes('Tailwind') && r.packageManager === 'pnpm' && r.scripts.dev === 'vite');
  ok('detect-env: static dir has no packageManager', JSON.parse(execFileSync(node, [det, root], { encoding: 'utf8' })).packageManager === null);
} catch (e) { ok('detect-env runs', false, e.message); }
fs.rmSync(tmp, { recursive: true, force: true });

const ins = path.join(skillDir, 'scripts/inspect.mjs');
const usage = spawnSync(node, [ins], { encoding: 'utf8' });
ok('inspect: no args exits 1 with usage', usage.status === 1 && /Usage/.test(usage.stderr));
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-inspect-'));
const probe = spawnSync(node, [ins, path.join(root, 'tests/fixtures/good.html'), '--out', path.join(out, 'good')], { encoding: 'utf8' });
if (probe.status === 2) {
  skip('inspect: fixture checks', 'Playwright/browser unavailable (script exited 2 with setup help, as designed)');
  ok('inspect: unavailable-tooling message gives setup options', /UNVERIFIED/.test(probe.stderr) && /playwright/i.test(probe.stderr));
} else {
  ok('inspect: clean fixture reports no mechanical issues', probe.status === 0 && (probe.stdout.match(/no mechanical issues detected/g) || []).length === 3, probe.stdout);
  ok('inspect: writes 3 screenshots + report.json', ['w390.png', 'w768.png', 'w1440.png', 'report.json'].every((f) => fs.existsSync(path.join(out, 'good', f))));
  const bad = spawnSync(node, [ins, path.join(root, 'tests/fixtures/bad.html'), '--out', path.join(out, 'bad')], { encoding: 'utf8' });
  const rep = JSON.parse(fs.readFileSync(path.join(out, 'bad/report.json'), 'utf8'));
  const v768 = rep.viewports.find((v) => v.width === 768);
  ok('inspect: flawed fixture flags overflow at 768', v768?.horizontalOverflow === true, bad.stdout);
  ok('inspect: flawed fixture flags unnamed controls, missing alt, no lang, 2 h1', v768.unnamedControls.length >= 2 && v768.imagesMissingAlt.length === 1 && !v768.lang && v768.h1Count === 2);
  ok('inspect: flawed fixture flags missing focus indicator at desktop', rep.viewports.find((v) => v.width === 1440).keyboard.withoutObviousFocusIndicator.length >= 1);
  ok('inspect: unreachable URL exits non-zero', spawnSync(node, [ins, 'http://127.0.0.1:9/', '--widths', '390', '--out', path.join(out, 'x')], { encoding: 'utf8' }).status === 1);
}
fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${failed ? 'FAILED' : 'OK'}: ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);
