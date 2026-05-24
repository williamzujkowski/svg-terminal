#!/usr/bin/env node

/**
 * svg-terminal CLI
 *
 * Usage:
 *   svg-terminal generate --config terminal.yml --output terminal.svg
 *   svg-terminal generate --config terminal.yml --output static.svg --static
 *   svg-terminal init
 *   svg-terminal themes
 *   svg-terminal blocks
 */

import { writeFileSync, watch as fsWatch } from 'node:fs';
import { resolve } from 'node:path';
import { generate, generateStatic, inspectCache, listBlocks, loadConfig, setStrictBlockConfig } from './index.js';
import { themes } from './themes/index.js';
import { ConfigError, BlockConfigError } from './core/errors.js';

// Injected by tsup `define`; falls back to '0.0.0-dev' under `tsx src/cli.ts`.
declare const __PKG_VERSION__: string;
const VERSION = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '0.0.0-dev';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

/** Format the "(static, minified, cache:frozen)" suffix on the generate log line. */
function formatModeTag(opts: { isStatic: boolean; minify: boolean; cacheMode: string }): string {
  const parts = [
    opts.isStatic && 'static',
    opts.minify && 'minified',
    opts.cacheMode !== 'normal' && `cache:${opts.cacheMode}`,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/** Pretty-print an error inside the watch loop without crashing the watcher. */
function formatWatchError(err: unknown): void {
  if (err instanceof ConfigError || err instanceof BlockConfigError) {
    console.error(`\x1b[31m${err.formatted}\x1b[0m`);
  } else {
    console.error('\x1b[31mError:\x1b[0m', err instanceof Error ? err.message : err);
  }
}

/** Human-readable age string for the cache check output. */
function humanAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/** Map mutually-exclusive cache flags to a CacheMode. Last flag wins. */
function resolveCacheMode(): 'normal' | 'refresh' | 'frozen' | 'off' {
  if (hasFlag('no-cache')) return 'off';
  if (hasFlag('refresh-cache')) return 'refresh';
  if (hasFlag('frozen-cache')) return 'frozen';
  return 'normal';
}

/**
 * Collapse inter-element whitespace in an SVG string.
 * Conservative — leaves attribute values and text-node content alone, only
 * strips whitespace that sits between tags.
 */
function minifySvg(svg: string): string {
  return svg
    .replace(/>\s+</g, '><')
    .replace(/\n\s+/g, '\n')
    .replace(/^\s+|\s+$/g, '');
}

async function main(): Promise<void> {
  if (hasFlag('version') || command === '--version') {
    console.log(`svg-terminal ${VERSION}`);
    return;
  }

  switch (command) {
    case 'generate': {
      const configPath = getFlag('config') ?? 'terminal.yml';
      const outputPath = getFlag('output') ?? 'terminal.svg';
      const isStatic = hasFlag('static');
      const minify = hasFlag('minify');
      const strict = hasFlag('strict');
      const watch = hasFlag('watch');
      const cacheMode = resolveCacheMode();

      setStrictBlockConfig(strict);
      const resolvedConfigPath = resolve(configPath);
      const resolvedOutputPath = resolve(outputPath);
      const genOpts = { configPath: resolvedConfigPath, cacheMode };
      const modeTag = formatModeTag({ isStatic, minify, cacheMode });

      const runOnce = async (): Promise<void> => {
        const userConfig = loadConfig(resolvedConfigPath);
        let svg = isStatic
          ? await generateStatic(userConfig, genOpts)
          : await generate(userConfig, genOpts);
        if (minify) svg = minifySvg(svg);
        writeFileSync(resolvedOutputPath, svg, 'utf-8');
        console.log(`Generated ${outputPath}${modeTag} (${(svg.length / 1024).toFixed(1)} KB)`);
      };

      if (!watch) {
        await runOnce();
        break;
      }

      // Initial generate happens synchronously before installing the watcher so
      // the first error surfaces immediately and the watch banner isn't a lie.
      try {
        await runOnce();
      } catch (e) {
        formatWatchError(e);
      }

      console.log(`\x1b[2m[svg-terminal] watching ${configPath}... (Ctrl-C to exit)\x1b[0m`);
      const DEBOUNCE_MS = 100;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let running = false;
      let queued = false;

      const trigger = (): void => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          timer = null;
          if (running) { queued = true; return; }
          running = true;
          try {
            await runOnce();
          } catch (e) {
            formatWatchError(e);
          } finally {
            running = false;
            if (queued) { queued = false; trigger(); }
          }
        }, DEBOUNCE_MS);
      };

      const watcher = fsWatch(resolvedConfigPath, { persistent: true }, () => trigger());

      // Editors that rename-on-save can detach fs.watch from the inode on
      // Linux. Re-arm if the file disappears and reappears.
      watcher.on('error', () => {
        // best-effort: fall through; user will notice if changes stop firing
      });

      process.on('SIGINT', () => {
        watcher.close();
        console.log('\n\x1b[2m[svg-terminal] stopped\x1b[0m');
        process.exit(0);
      });

      // Keep process alive until SIGINT.
      return;
    }

    case 'init': {
      const starter = `# svg-terminal configuration
# See: https://github.com/williamzujkowski/svg-terminal

theme: dracula

window:
  width: 1000
  height: 560
  title: "user@terminal:~"
  # style: macos       # macos | floating | minimal | none
  # autoHeight: false   # Auto-calculate height from content
  # minHeight: 300      # Minimum height when autoHeight is true
  # maxHeight: 1200     # Maximum height when autoHeight is true

terminal:
  prompt: "user@host:~$ "
  fontSize: 14

effects:
  textGlow: false   # phosphor halo — try true with amber / green-phosphor / cyberpunk
  shadow: true
  scanlines: true

# Animation timing (all values in ms)
# animation:
#   cursorBlinkCycle: 1000
#   outputLineStagger: 50
#   commandOutputPause: 300
#   loop: true          # true (infinite) | false (play once) | number (N times)

# Window chrome appearance
# chrome:
#   titleFontSize: 13
#   dimOpacity: 0.6

blocks:
  - block: neofetch
    config:
      username: user
      hostname: terminal
      os: TerminalOS v1.0
      shell: bash 5.2
      role: Developer
      languages: TypeScript, Python

  - block: fortune
    config:
      fortunes:
        - "The best code is no code at all."
        - "Talk is cheap. Show me the code."
        - "First, solve the problem. Then, write the code."

  - block: custom
    config:
      command: echo "Thanks for visiting!"
      lines:
        - "[[fg:green]]Thanks for visiting my profile![[/fg]]"
        - ""
        - "Have a great day!"
`;
      writeFileSync('terminal.yml', starter, 'utf-8');
      console.log('Created terminal.yml — edit it and run: svg-terminal generate');
      break;
    }

    case 'themes': {
      console.log('Available themes:');
      for (const name of Object.keys(themes)) {
        console.log(`  - ${name}`);
      }
      break;
    }

    case 'blocks': {
      console.log('Available blocks:');
      for (const name of listBlocks()) {
        console.log(`  - ${name}`);
      }
      break;
    }

    case 'cache': {
      const sub = args[1];
      if (sub !== 'check') {
        console.error('Usage: svg-terminal cache check [--config <path>]');
        process.exit(1);
      }
      const configPath = getFlag('config') ?? 'terminal.yml';
      const resolved = resolve(configPath);
      const userConfig = loadConfig(resolved);
      const { filePath, results } = inspectCache(userConfig, resolved);
      const w = Math.max(0, ...results.map(r => r.key.length));
      console.log(`Checking cache at ${filePath}...`);
      if (results.length === 0) {
        console.log('  (no cacheable blocks in this config)');
        break;
      }
      let bad = 0;
      for (const r of results) {
        const ageStr = r.ageSeconds !== undefined ? `age ${humanAge(r.ageSeconds)}` : '';
        const tag = r.status === 'OK' ? `\x1b[32mOK\x1b[0m   `
          : r.status === 'STALE' ? `\x1b[33mSTALE\x1b[0m`
          : `\x1b[31mMISS\x1b[0m `;
        console.log(`  ${r.key.padEnd(w)}  ${tag}  ${ageStr}`);
        if (r.status !== 'OK') bad++;
      }
      if (bad > 0) {
        console.error(`\n${bad} cacheable block(s) need a refresh. Run: svg-terminal generate --refresh-cache`);
        process.exit(1);
      }
      break;
    }

    default: {
      console.log(`svg-terminal — Generate animated SVG terminals

Commands:
  generate     Generate SVG from config file
  init         Create a starter terminal.yml
  themes       List available themes
  blocks       List available block types
  cache check  Verify dynamic-block cache freshness (exit 1 on stale/missing)

Options:
  --config    Config file path (default: terminal.yml)
  --output    Output file path (default: terminal.svg)
  --static    Generate non-animated SVG (final frame snapshot)
  --minify          Strip inter-element whitespace for smaller output
  --strict          Promote unknown-block-config-key warnings to hard errors
  --watch           Re-generate on config file change (Ctrl-C to exit)
  --no-cache        Don't read or write the dynamic-block fetch cache
  --refresh-cache   Force refresh: ignore existing cache entries, re-fetch all
  --frozen-cache    Use cached values only; never fetch (CI offline mode)
  --version         Print version number

Example:
  svg-terminal init
  svg-terminal generate --config terminal.yml --output terminal.svg
  svg-terminal generate --config terminal.yml --output static.svg --static
  svg-terminal generate --config terminal.yml --output tiny.svg --minify
`);
    }
  }
}

main().catch((err: unknown) => {
  if (err instanceof ConfigError || err instanceof BlockConfigError) {
    console.error(err.formatted);
  } else {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
