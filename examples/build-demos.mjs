#!/usr/bin/env node
/**
 * Regenerates examples/demo.svg + the per-theme gallery under examples/gallery/.
 * Driven by npm run demo. Cross-platform (no shell loops), and CI uses the
 * exit code from `git diff --exit-code` afterward to verify nothing drifted.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { generate, generateStatic } from '../dist/index.js';

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
    const cfg = {
      ...tplConfig,
      theme,
      window: { ...tplConfig.window, title: `user@${theme}:~` },
    };
    // The win95 mergeConfig path auto-applies its chrome — no per-theme override needed.
    const opts = { configPath: tplPath, cacheMode: 'off', now: FIXED_NOW };
    await writeSvg(await generate(cfg, opts), `examples/gallery/${theme}.svg`);
  }
}

await buildHero();
await buildGallery();
