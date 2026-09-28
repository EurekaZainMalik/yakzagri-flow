#!/usr/bin/env node
/**
 * Background-surface naming guard.
 *
 * The app has exactly one Tailwind background name per token:
 *
 *   --surface-0..3  →  bg-surface-0 .. bg-surface-3   (page / card / elevated / overlay)
 *   --bg-input      →  bg-bg-input                    (form controls; no surface twin)
 *
 * `tailwind.config.ts` used to also expose the same two custom properties under
 * legacy aliases (`bg-card`, `bg-elevated`, `bg-primary`, `bg-overlay`,
 * `bg-input` and the doubled `bg-bg-*` names), so one token had two spellings
 * and different files picked different ones. Those aliases are gone; this guard
 * keeps them gone:
 *
 *   1. no source file may use a retired background spelling,
 *   2. `tailwind.config.ts` may not re-introduce the alias values, and
 *   3. both layers must still define the canonical `surface-0..3` names.
 *
 * Dependency-free (node:fs / node:path only).
 *
 * Usage: node scripts/check-token-names.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const ROOT = path.resolve(FRONTEND, '..');
const CSS_PATH = path.join(FRONTEND, 'src', 'app', 'globals.css');
const CONFIG_PATH = path.join(FRONTEND, 'tailwind.config.ts');

const SURFACES = ['surface-0', 'surface-1', 'surface-2', 'surface-3'];
const INPUT_TOKEN = 'bg-input';

/** Spellings that must not come back, and the canonical name to use instead. */
const RETIRED = {
  'bg-card': 'bg-surface-1',
  'bg-elevated': 'bg-surface-2',
  'bg-primary': 'bg-surface-0',
  'bg-overlay': 'bg-surface-3',
  'bg-input': 'bg-bg-input',
  'bg-bg-card': 'bg-surface-1',
  'bg-bg-elevated': 'bg-surface-2',
  'bg-bg-primary': 'bg-surface-0',
  'bg-bg-overlay': 'bg-surface-3',
  'border-bg-primary': 'border-surface-0',
  'text-bg-primary': 'text-surface-0',
  'ring-offset-bg-primary': 'ring-offset-surface-0',
};

/** Custom properties the retired aliases were defined from. */
const RETIRED_VARS = ['--bg-card', '--bg-elevated', '--bg-primary', '--bg-overlay'];

const SCAN_DIRS = [path.join(FRONTEND, 'src'), path.join(FRONTEND, 'tests'), path.join(FRONTEND, 'public', 'components')];
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'coverage', 'playwright-report', 'test-results']);

const problems = [];

// ── parse the two definition layers ───────────────────────────────────────────

function blockAfter(text, selector) {
  const at = text.indexOf(`${selector}{`) === -1 ? text.indexOf(`${selector} {`) : text.indexOf(`${selector}{`);
  if (at === -1) throw new Error(`\`${selector}\` block not found`);
  let depth = 0;
  for (let i = text.indexOf('{', at); i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(text.indexOf('{', at) + 1, i);
    }
  }
  throw new Error(`unterminated block for \`${selector}\``);
}

const css = fs.readFileSync(CSS_PATH, 'utf8');
const themeBlock = blockAfter(css, '@theme inline');
const themeNames = new Set(
  [...themeBlock.matchAll(/^\s*--color-([a-z0-9-]+):\s*var\(--[a-z0-9-]+\);\s*$/gm)].map((m) => m[1]),
);

const config = fs.readFileSync(CONFIG_PATH, 'utf8');
const backgroundColorKeys = new Set(
  [...blockAfter(config, 'backgroundColor:').matchAll(/^\s*"?([A-Za-z0-9-]+)"?:\s*"var\(--/gm)].map((m) => m[1]),
);

// ── 1. the aliases must not be re-added to the config ─────────────────────────

for (const name of RETIRED_VARS) {
  if (config.includes(`var(${name})`)) {
    problems.push(`tailwind.config.ts: \`${name}\` is aliased again — use the surface scale instead`);
  }
}

// ── 2. the canonical names must exist in both layers ──────────────────────────

for (const surface of SURFACES) {
  if (!themeNames.has(surface)) {
    problems.push(`src/app/globals.css: \`--color-${surface}\` is missing from the @theme inline block`);
  }
  if (!backgroundColorKeys.has(surface)) {
    problems.push(`tailwind.config.ts: \`${surface}\` is missing from backgroundColor`);
  }
}
if (!themeNames.has(INPUT_TOKEN)) {
  problems.push(`src/app/globals.css: \`--color-${INPUT_TOKEN}\` is missing from the @theme inline block`);
}

// ── 3. no source file may use a retired spelling ──────────────────────────────

const RETIRED_RE = new RegExp(`(?<![-\\w])(${Object.keys(RETIRED).join('|')})(?![-\\w])`);
let scanned = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full);
      continue;
    }
    if (!SCAN_EXT.has(path.extname(entry.name))) continue;
    scanned++;
    const text = fs.readFileSync(full, 'utf8');
    text.split('\n').forEach((line, i) => {
      const hit = RETIRED_RE.exec(line);
      if (hit) {
        problems.push(
          `${path.relative(ROOT, full)}:${i + 1}: \`${hit[1]}\` is a retired background name — ` +
            `use \`${RETIRED[hit[1]]}\``,
        );
      }
    });
  }
}

for (const dir of SCAN_DIRS) walk(dir);

if (problems.length > 0) {
  console.error(`check-token-names: ${problems.length} problem(s) found\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `check-token-names: OK (${scanned} files scanned, ${SURFACES.length} surface names, ` +
    `${Object.keys(RETIRED).length} retired spellings)`,
);
