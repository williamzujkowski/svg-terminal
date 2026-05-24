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

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generate, generateStatic, listBlocks, loadConfig } from './index.js';
import { themes } from './themes/index.js';
import { ConfigError } from './core/errors.js';

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

      const userConfig = loadConfig(resolve(configPath));
      let svg = isStatic
        ? await generateStatic(userConfig)
        : await generate(userConfig);
      if (minify) svg = minifySvg(svg);
      writeFileSync(resolve(outputPath), svg, 'utf-8');
      const mode = [isStatic && 'static', minify && 'minified'].filter(Boolean).join(', ');
      const tag = mode ? ` (${mode})` : '';
      console.log(`Generated ${outputPath}${tag} (${(svg.length / 1024).toFixed(1)} KB)`);
      break;
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

    default: {
      console.log(`svg-terminal — Generate animated SVG terminals

Commands:
  generate    Generate SVG from config file
  init        Create a starter terminal.yml
  themes      List available themes
  blocks      List available block types

Options:
  --config    Config file path (default: terminal.yml)
  --output    Output file path (default: terminal.svg)
  --static    Generate non-animated SVG (final frame snapshot)
  --minify    Strip inter-element whitespace for smaller output
  --version   Print version number

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
  if (err instanceof ConfigError) {
    console.error(err.formatted);
  } else {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
