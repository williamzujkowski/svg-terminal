#!/usr/bin/env node
/**
 * Regenerates examples/demo.svg + the per-theme gallery under examples/gallery/.
 * Driven by npm run demo. Cross-platform (no shell loops), and CI uses the
 * exit code from `git diff --exit-code` afterward to verify nothing drifted.
 *
 * Pin TZ=UTC BEFORE importing the library — `ascii-clock` and `uptime`
 * use `context.now.getHours()` / `getMinutes()` which read LOCAL timezone.
 * Without this, regen on a non-UTC machine (e.g. America/New_York) writes
 * different bytes than CI's UTC regen → demo-verify gate fails. Closes
 * the CI byte-drift class of issues that #122 surfaced.
 */
process.env.TZ = 'UTC';

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { generate, generateStatic, getBlock, listBlocks } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const THEMES = [
  'dracula',
  'nord',
  'monokai',
  'amber',
  'green-phosphor',
  'cyberpunk',
  'solarized-dark',
  'win95',
  'catppuccin',
  'tokyo-night',
  'gruvbox',
  'high-contrast',
  // OKLCH WCAG-AAA additions (v1.2.0)
  'modus-vivendi',
  'oxocarbon',
  'rose-pine',
  'everforest',
  'kanagawa',
  'flexoki',
  'github-light',
  'dayfox',
];

async function writeSvg(svg, relPath) {
  const out = resolve(ROOT, relPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg, 'utf-8');
  const kb = (svg.length / 1024).toFixed(1);
  console.log(`  ${relPath}  (${kb} KB)`);
}

// Pinned timestamp so the demos are byte-identical run-over-run — required
// for the CI `git diff --exit-code` check. Pick any sensible time; the only
// time-dependent block in the demo set is ascii-clock (HH:MM:SS).
const FIXED_NOW = new Date('2026-05-25T13:37:00Z');

async function buildHero() {
  console.log('hero:');
  const cfgPath = resolve(HERE, 'demo.yml');
  const userConfig = yaml.load(readFileSync(cfgPath, 'utf-8'));
  const opts = { configPath: cfgPath, cacheMode: 'off', now: FIXED_NOW };
  await writeSvg(await generate(userConfig, opts), 'examples/demo.svg');
  await writeSvg(await generateStatic(userConfig, opts), 'examples/demo-static.svg');
}

async function buildGallery() {
  console.log('gallery:');
  const tplPath = resolve(HERE, 'gallery', '_template.yml');
  const tplConfig = yaml.load(readFileSync(tplPath, 'utf-8'));
  for (const theme of THEMES) {
    // Per-theme title bar so the gallery thumbnail at-a-glance shows which
    // theme it is — was `user@svg-terminal:~` for every theme, now
    // `user@<theme>:~` so the thumbnail reads as a labeled card without
    // needing the filename.
    // The OKLCH modern themes are meant to read crisp + sharp — preview them
    // with their default-off scanlines (the template forces scanlines on for
    // the classics' richer look). Drop shadow too for a clean modern card.
    const MODERN = new Set(['modus-vivendi', 'oxocarbon', 'rose-pine', 'everforest', 'kanagawa', 'flexoki', 'github-light', 'dayfox']);
    const cfg = {
      ...tplConfig,
      theme,
      window: { ...tplConfig.window, title: `user@${theme}:~` },
      ...(MODERN.has(theme) ? { effects: { scanlines: false, shadow: false } } : {}),
    };
    // The win95 mergeConfig path auto-applies its chrome — no per-theme override needed.
    const opts = { configPath: tplPath, cacheMode: 'off', now: FIXED_NOW };
    await writeSvg(await generate(cfg, opts), `examples/gallery/${theme}.svg`);
  }
}

/**
 * Per-block catalog (closes #118): one SVG per block + an index README so
 * users can SEE what each of the 48 built-ins renders, not just read the
 * one-line description. CI's `git diff --exit-code` keeps it in sync.
 *
 * For blocks that need required config to render meaningfully (weather,
 * github-stats, github-languages — all use `useCache` and fall back when
 * config is missing or fetch fails), we provide a representative config
 * inline. With cacheMode='off' + no real network call, the cacheable
 * blocks just render their fallback content — that's fine for the
 * catalog (it shows the "no live data" appearance the user will see in
 * an offline / cold-cache state).
 */
const BLOCK_CATALOG_CONFIG = {
  weather: { location: 'Brooklyn' },
  'github-stats': { username: 'octocat' },
  'github-languages': { username: 'octocat' },
  // motd shows weather embed if weather is set — keep static for the catalog
  motd: { title: 'WELCOME', subtitle: 'A 48-block catalog' },
  // quote + fun-fact normally fetch random content per render — pin to a
  // fixed fallback string so the catalog SVG is byte-stable across regen
  // passes (CI gate: `npm run demo:regen && git diff --exit-code examples/`).
  quote: {
    fallback: 'First, solve the problem. Then, write the code.',
    fallbackAuthor: 'John Johnson',
  },
  'fun-fact': {
    fallback: 'Honey never spoils. Archaeologists have found 3000-year-old honey that was still edible.',
  },
};

async function buildBlockCatalog() {
  console.log('block catalog:');
  const rows = [];
  for (const name of listBlocks()) {
    const block = getBlock(name);
    if (!block) continue;
    const blockCfg = BLOCK_CATALOG_CONFIG[name] ?? {};
    const userConfig = {
      theme: 'dracula',
      window: {
        width: 640,
        autoHeight: true,
        minHeight: 80,
        maxHeight: 600,
        title: name,
      },
      // Force a near-instant fetch timeout for the catalog pass so cacheable
      // blocks ALWAYS take their fallback path. Without this, weather /
      // github-* / quote / fun-fact would hit live APIs and the random
      // responses would byte-drift between regen runs (CI gate fail). The
      // fallback content is what offline / cold-cache users see anyway, so
      // it's a faithful catalog preview.
      fetchTimeout: 1,
      blocks: [{ block: name, config: blockCfg }],
    };
    try {
      const svg = await generate(userConfig, { cacheMode: 'off', now: FIXED_NOW });
      await writeSvg(svg, `examples/blocks/${name}.svg`);
      rows.push({ name, desc: block.description ?? '', cacheable: !!block.cacheable });
    } catch (err) {
      console.warn(`  SKIP ${name}: ${err.message}`);
    }
  }
  // Index README — one row per block, links to YAML + SVG thumbnail.
  const lines = [
    '# Block catalog',
    '',
    `${rows.length} built-in blocks. One SVG per block; click a thumbnail to view full size.`,
    '',
    'Regenerate: `npm run demo` (auto-built from `listBlocks()` so a new block gets a catalog row for free).',
    '',
    '| Block | Description | Preview |',
    '|-------|-------------|---------|',
    ...rows.map(r => {
      const cacheTag = r.cacheable ? ' *' : '';
      return `| \`${r.name}\`${cacheTag} | ${r.desc} | <img src="./${r.name}.svg" alt="${r.name} preview" width="320"/> |`;
    }),
    '',
    '`*` = cacheable block (participates in the on-disk dynamic-block cache).',
    '',
  ];
  await writeFile('examples/blocks/README.md', lines.join('\n'));
}

async function writeFile(relPath, content) {
  const out = resolve(ROOT, relPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content, 'utf-8');
  console.log(`  ${relPath}`);
}

await buildHero();
await buildGallery();
await buildBlockCatalog();
