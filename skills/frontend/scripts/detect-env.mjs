#!/usr/bin/env node
// Detect what a frontend project is and which verification tools are actually available.
// Usage: node detect-env.mjs [projectDir]      Prints JSON. Never installs anything.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const dir = path.resolve(process.argv[2] || '.');
const exists = (...p) => fs.existsSync(path.join(dir, ...p));
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

function resolvable(mod) {
  for (const base of [path.join(dir, 'noop.js'), import.meta.url.replace('file://', '')]) {
    try { return createRequire(base).resolve(mod); } catch { /* try next */ }
  }
  return null;
}

const pkg = readJson(path.join(dir, 'package.json'));
const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
const has = (...names) => names.filter((n) => n in deps);

const frameworks = [
  ['next', 'Next.js'], ['nuxt', 'Nuxt'], ['@sveltejs/kit', 'SvelteKit'], ['svelte', 'Svelte'],
  ['astro', 'Astro'], ['@remix-run/react', 'Remix'], ['react-router', 'React Router'], ['react', 'React'],
  ['vue', 'Vue'], ['@angular/core', 'Angular'], ['solid-js', 'Solid'], ['preact', 'Preact'], ['htmx.org', 'htmx'],
];
const bundlers = ['vite', 'webpack', 'parcel', 'esbuild', '@rsbuild/core', 'turbo'];
const styling = [
  ['tailwindcss', 'Tailwind'], ['styled-components', 'styled-components'], ['@emotion/react', 'Emotion'],
  ['sass', 'Sass'], ['@vanilla-extract/css', 'vanilla-extract'], ['@pandacss/dev', 'Panda CSS'], ['unocss', 'UnoCSS'],
];
const uiLibs = [
  '@mui/material', 'antd', '@chakra-ui/react', '@mantine/core', '@radix-ui/react-dialog', 'radix-ui',
  '@headlessui/react', '@ark-ui/react', 'react-aria-components', '@shadcn/ui', 'daisyui', 'bootstrap', '@primer/react',
];

const lock = [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lockb', 'bun'], ['bun.lock', 'bun'], ['package-lock.json', 'npm']]
  .find(([f]) => exists(f));

// Design-token hints: where tokens/theme are likely defined.
const tokenFiles = [];
for (const f of ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs', 'components.json',
  'theme.ts', 'theme.js', 'src/theme.ts', 'src/theme.js', 'src/styles/tokens.css', 'src/tokens.css', 'tokens.json', 'design-tokens.json']) {
  if (exists(f)) tokenFiles.push(f);
}
const cssWithVars = [];
(function scan(d, depth) {
  if (depth > 3 || cssWithVars.length >= 5) return;
  let entries = [];
  try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(e.name)) continue;
    const full = path.join(d, e.name);
    if (e.isDirectory()) scan(full, depth + 1);
    else if (/\.(css|scss)$/.test(e.name)) {
      try {
        const txt = fs.readFileSync(full, 'utf8');
        const n = (txt.match(/--[a-z][\w-]*\s*:/gi) || []).length;
        if (n >= 5 && cssWithVars.length < 5) cssWithVars.push({ file: path.relative(dir, full), customProperties: n });
      } catch { /* ignore */ }
    }
  }
})(dir, 0);

// Browser tooling.
const pw = resolvable('playwright');
const axe = resolvable('@axe-core/playwright');
const browserDirs = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), '.cache/ms-playwright'),
  path.join(os.homedir(), 'Library/Caches/ms-playwright'), '/opt/pw-browsers'].filter(Boolean);
const browsersFound = browserDirs.filter((d) => { try { return fs.readdirSync(d).some((x) => /chrom/i.test(x)); } catch { return false; } });
const systemChrome = ['google-chrome', 'chromium', 'chromium-browser', 'chrome'].find((b) =>
  (process.env.PATH || '').split(path.delimiter).some((p) => fs.existsSync(path.join(p, b))));

const scripts = pkg?.scripts || {};
const pick = (...names) => Object.fromEntries(names.filter((n) => scripts[n]).map((n) => [n, scripts[n]]));

const report = {
  projectDir: dir,
  kind: pkg ? 'node-project' : (exists('index.html') ? 'static-html' : 'unknown'),
  packageManager: lock?.[1] || (pkg ? 'unknown (no lockfile)' : null),
  frameworks: frameworks.filter(([d]) => d in deps).map(([, n]) => n),
  bundlers: has(...bundlers),
  typescript: exists('tsconfig.json') || 'typescript' in deps,
  styling: styling.filter(([d]) => d in deps).map(([, n]) => n),
  componentLibraries: has(...uiLibs),
  designTokenHints: { files: tokenFiles, cssFilesWithCustomProperties: cssWithVars },
  scripts: pick('dev', 'start', 'build', 'preview', 'lint', 'typecheck', 'type-check', 'test', 'test:e2e', 'e2e', 'storybook'),
  existingTests: { playwrightConfig: ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'].filter((f) => exists(f)),
    cypressConfig: exists('cypress.config.ts') || exists('cypress.config.js') },
  browserTooling: {
    nodeVersion: process.version,
    playwrightModule: pw,
    axePlaywrightModule: axe,
    browserCacheDirs: browsersFound,
    systemChromeBinary: systemChrome || null,
    canUseBundledInspectScript: Boolean(pw && (browsersFound.length || systemChrome)),
    note: 'Presence of files is a hint, not proof a browser launches. inspect.mjs exits 2 with setup help if launch fails. '
      + 'Also check whether a browser MCP or Playwright CLI tool is exposed in this session; this script cannot see that.',
  },
};
console.log(JSON.stringify(report, null, 2));
