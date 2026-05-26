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

import { existsSync, writeFileSync, watch as fsWatch } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { generate, generateStatic, getBlock, inspectCache, listBlocks, loadConfig, mergeConfig, setStrictBlockConfig } from './index.js';
import { themes } from './themes/index.js';
import { ConfigError, BlockConfigError } from './core/errors.js';
import { formatModeTag, formatZodType, humanAge, isZodOptional, minifySvg, resolveCacheMode, scrubSecrets } from './core/cli-helpers.js';

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

/** Flags accepted by `svg-terminal generate`. Any `--foo` not in this set
 *  triggers a stderr warning so users catch typos like `--no-chache`. */
const GENERATE_KNOWN_FLAGS = new Set([
  'config', 'output', 'static', 'minify', 'strict', 'watch',
  'no-cache', 'refresh-cache', 'frozen-cache', 'cache-mode',
  'timings', 'explain',
]);

/** Warn (don't fail) on unknown `--flag` tokens. Skips value-position tokens
 *  by tracking which flags take a value. */
function warnUnknownFlags(tokens: readonly string[], known: ReadonlySet<string>): void {
  const valueFlags = new Set(['config', 'output', 'cache-mode']);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (!tok.startsWith('--')) continue;
    const name = tok.slice(2);
    if (!known.has(name)) {
      console.error(`\x1b[33m[svg-terminal] warning: unknown flag "${tok}" — ignoring\x1b[0m`);
    }
    if (valueFlags.has(name)) i++; // skip the value token
  }
}

/** Pretty-print an error inside the watch loop without crashing the watcher. */
function formatWatchError(err: unknown): void {
  if (err instanceof ConfigError || err instanceof BlockConfigError) {
    console.error(`\x1b[31m${err.formatted}\x1b[0m`);
  } else {
    console.error('\x1b[31mError:\x1b[0m', err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  if (hasFlag('version') || command === '--version') {
    console.log(`svg-terminal ${VERSION}`);
    return;
  }

  switch (command) {
    case 'generate': {
      // Warn early on typo'd flags. Silent flag-ignore is the worst class of
      // CLI bug — `--no-chache` would silently fall back to normal cache mode
      // while the user thinks they bypassed it.
      warnUnknownFlags(args.slice(1), GENERATE_KNOWN_FLAGS);
      const configPath = getFlag('config') ?? 'terminal.yml';
      const outputPath = getFlag('output') ?? 'terminal.svg';
      const isStatic = hasFlag('static');
      const minify = hasFlag('minify');
      const strict = hasFlag('strict');
      const watch = hasFlag('watch');
      const timings = hasFlag('timings');
      const explain = hasFlag('explain');
      const cacheMode = resolveCacheMode(args);

      setStrictBlockConfig(strict);
      const resolvedConfigPath = resolve(configPath);
      const resolvedOutputPath = resolve(outputPath);
      const modeTag = formatModeTag({ isStatic, minify, cacheMode });

      // Per-run cache stats accumulator. Reset each call. Surfaces in the
      // final log line when any dynamic block participated; tells the user
      // whether they got fresh data, served cache, or fell back to defaults
      // (the "frozen-cache served stale" / "network silently failed" cases).
      const cacheStats = { hit: 0, miss: 0, refreshed: 0, fallback: 0, fallbacks: [] as string[] };
      const onCacheEvent = (evt: 'hit' | 'miss' | 'refreshed' | 'fallback', key: string): void => {
        cacheStats[evt]++;
        if (evt === 'fallback') cacheStats.fallbacks.push(key);
      };

      const runOnce = async (): Promise<void> => {
        // Reset per-run.
        cacheStats.hit = 0;
        cacheStats.miss = 0;
        cacheStats.refreshed = 0;
        cacheStats.fallback = 0;
        cacheStats.fallbacks = [];

        const start = performance.now();
        const tLoadStart = performance.now();
        const userConfig = await loadConfig(resolvedConfigPath);
        const tLoadMs = performance.now() - tLoadStart;

        // --explain: emit a JSON dump of the resolved config + block list to
        // stderr (so it doesn't interleave with stdout if the SVG is piped).
        // Runs the full generate path after; doesn't skip writing.
        //
        // Secret scrubbing (#114 L4): keys matching SECRET_KEY_RE in any
        // block.config are redacted to "[REDACTED]" before emit. No built-in
        // block today accepts a token / secret config, but third-party blocks
        // via registerBlock may — and the --explain output ends up in CI
        // logs and shareable stack traces.
        if (explain) {
          const merged = mergeConfig(userConfig);
          const explainDump = {
            configPath: resolvedConfigPath,
            outputPath: resolvedOutputPath,
            theme: merged.theme.name,
            window: merged.window,
            text: merged.text,
            effects: merged.effects,
            blockCount: userConfig.blocks.length,
            blocks: userConfig.blocks.map(entry => {
              const block = getBlock(entry.block);
              return {
                name: entry.block,
                cacheable: block?.cacheable ?? false,
                registered: !!block,
                config: entry.config ? scrubSecrets(entry.config) : undefined,
              };
            }),
            maxDuration: merged.maxDuration,
          };
          console.error(`[svg-terminal --explain]\n${JSON.stringify(explainDump, null, 2)}`);
        }

        const genOpts = { configPath: resolvedConfigPath, cacheMode, onCacheEvent };
        const tGenStart = performance.now();
        let svg = isStatic
          ? await generateStatic(userConfig, genOpts)
          : await generate(userConfig, genOpts);
        const tGenMs = performance.now() - tGenStart;

        const tWriteStart = performance.now();
        if (minify) svg = minifySvg(svg);
        writeFileSync(resolvedOutputPath, svg, 'utf-8');
        const tWriteMs = performance.now() - tWriteStart;

        const elapsed = Math.round(performance.now() - start);
        // In watch mode, prefix the log with an HH:MM:SS timestamp + render
        // duration so the user can see when each re-render happened and how
        // long it took. Without this the watch log is silent-looking.
        const prefix = watch ? `[${new Date().toTimeString().slice(0, 8)}] ` : '';
        const duration = watch ? `, ${elapsed}ms` : '';
        console.log(`${prefix}Generated ${outputPath}${modeTag} (${(svg.length / 1024).toFixed(1)} KB${duration})`);

        if (timings) {
          // Phase breakdown to stderr. Values are wall-clock ms for the most
          // recent runOnce call. Useful for spotting "is loadConfig slow?"
          // vs "is generate slow?" vs "is write slow?".
          console.error(
            `[svg-terminal --timings]  load: ${tLoadMs.toFixed(1)}ms  generate: ${tGenMs.toFixed(1)}ms  write: ${tWriteMs.toFixed(1)}ms  total: ${elapsed}ms`,
          );
        }

        // Cache summary — print when any dynamic block participated. Fallback
        // events are the surprising case (network failed / no username /
        // frozen but cache empty); always-print those even if hits=0.
        const totalEvents = cacheStats.hit + cacheStats.miss + cacheStats.refreshed + cacheStats.fallback;
        if (totalEvents > 0) {
          const parts: string[] = [];
          if (cacheStats.hit) parts.push(`\x1b[32mhit ${cacheStats.hit}\x1b[0m`);
          if (cacheStats.miss) parts.push(`miss ${cacheStats.miss}`);
          if (cacheStats.refreshed) parts.push(`refreshed ${cacheStats.refreshed}`);
          if (cacheStats.fallback) parts.push(`\x1b[33mfallback ${cacheStats.fallback}\x1b[0m`);
          const fallbackList = cacheStats.fallbacks.length > 0 ? ` [${cacheStats.fallbacks.join(', ')}]` : '';
          console.error(`[svg-terminal cache]  ${parts.join('  ')}${fallbackList}`);
        }
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

      // Watch the parent directory + filter by filename. This survives the
      // common editor patterns that detach a file-level fs.watch on Linux:
      // vim's backupcopy=no (write-then-rename), plain rm-then-touch, and
      // VSCode's atomic-save dance. Re-bind isn't needed because the dir
      // watcher stays valid even when the file disappears and reappears.
      const configDir = dirname(resolvedConfigPath);
      const configName = basename(resolvedConfigPath);
      const watcher = fsWatch(configDir, { persistent: true }, (_event, filename) => {
        if (filename === configName) trigger();
      });

      watcher.on('error', err => {
        console.error(`\x1b[31m[svg-terminal] watch error: ${err.message}\x1b[0m`);
      });

      // Close the watcher on SIGINT (Ctrl-C) AND SIGTERM (docker stop,
      // systemctl, kill, etc.) — process managers send SIGTERM, not SIGINT,
      // and without this handler the watcher leaks until the kernel reaps it.
      const cleanup = (): void => {
        watcher.close();
        console.log('\n\x1b[2m[svg-terminal] stopped\x1b[0m');
        process.exit(0);
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Keep process alive until a signal fires.
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
  # style: macos       # macos | win95 | floating | minimal | none
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

  # Uncomment to see an animated block (the library's signature feature) —
  # spinners, clocks, dice rolls. Multi-frame animation, single-line restriction.
  # - block: loading-spinner
  #   config:
  #     label: "deploying to production"

  - block: custom
    config:
      command: echo "Thanks for visiting!"
      lines:
        - "[[fg:green]]Thanks for visiting my profile![[/fg]]"
        - ""
        - "Have a great day!"
`;
      const targetPath = resolve('terminal.yml');
      // Don't silently clobber a hand-tuned config. The HIGH-impact UX bug
      // for a tool whose entry point is `init` — losing 30 minutes of YAML
      // to a stray ↑-enter is unforgivable.
      if (existsSync(targetPath) && !hasFlag('force')) {
        console.error('terminal.yml already exists. Use --force to overwrite.');
        process.exit(1);
      }
      writeFileSync(targetPath, starter, 'utf-8');
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
      const target = args[1];
      if (target) {
        // Single-block inspection: print description, cacheable tag, and the
        // config schema's fields. Each field as `name: type` with (required)
        // marker if the field isn't .optional()-wrapped. Best-effort — exotic
        // zod constructs print their bare type name (see formatZodType).
        const block = getBlock(target);
        if (!block) {
          console.error(`Unknown block "${target}". Run: svg-terminal blocks`);
          process.exit(1);
        }
        console.log(`${block.name} — ${block.description}`);
        if (block.cacheable) console.log('  cacheable: yes (participates in .svg-terminal-cache.json)');
        const schema = block.configSchema as { shape?: Record<string, unknown> } | undefined;
        const shape = schema?.shape;
        if (!shape || Object.keys(shape).length === 0) {
          console.log('  Config: (no fields)');
          break;
        }
        // Pad field names to a uniform column width for legibility.
        const names = Object.keys(shape);
        const w = Math.max(...names.map(n => n.length));
        console.log('  Config:');
        for (const name of names) {
          const t = shape[name];
          const tag = isZodOptional(t) ? '' : '  (required)';
          console.log(`    ${name.padEnd(w)}  ${formatZodType(t)}${tag}`);
        }
        console.log('');
        console.log(`  Plus the universal entry-level keys: command, color, typing, pause`);
        break;
      }
      // Unfiltered list — keep concise but tag cacheable blocks so users can
      // tell at a glance which need network / cache management.
      console.log('Available blocks (cacheable blocks marked *):');
      for (const name of listBlocks()) {
        const block = getBlock(name);
        const mark = block?.cacheable ? ' *' : '';
        console.log(`  - ${name}${mark}`);
      }
      console.log('');
      console.log('Run `svg-terminal blocks <name>` to see a block\'s config schema.');
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
      const userConfig = await loadConfig(resolved);
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
  generate           Generate SVG from config file
  init               Create a starter terminal.yml (refuses to overwrite without --force)
  themes             List available themes
  blocks [<name>]    List available block types, or print one block's config schema
  cache check        Verify dynamic-block cache freshness (exit 1 on stale/missing)

Generate options:
  --config <path>    Config file path (default: terminal.yml)
  --output <path>    Output file path (default: terminal.svg)
  --static           Render the non-animated final-frame snapshot
  --minify           Strip inter-element whitespace for smaller output
  --strict           Promote unknown-block-config-key warnings to hard errors
  --watch            Re-generate on config file change (Ctrl-C to exit)
  --timings          Print per-phase wall-clock timings (load, generate, write) to stderr
  --explain          Print the resolved config + block list as JSON to stderr

Cache events appear in stderr automatically when any dynamic block
participates ([svg-terminal cache] hit N miss N fallback N [block-names]).

Cache modes (mutually exclusive — defaults to normal):
  --no-cache         Don't read or write the dynamic-block fetch cache
  --refresh-cache    Force refresh: ignore existing cache entries, re-fetch all
  --frozen-cache     Use cached values only; never fetch (CI offline mode)
  --cache-mode <m>   Explicit: normal | refresh | frozen | off

Init options:
  --force            Overwrite an existing terminal.yml

Global:
  --version          Print version number

Examples:
  svg-terminal init
  svg-terminal generate --config terminal.yml --output terminal.svg
  svg-terminal generate --static
  svg-terminal generate --watch
  svg-terminal cache check --config terminal.yml
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
