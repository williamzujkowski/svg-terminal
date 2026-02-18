#!/usr/bin/env node

/**
 * svg-terminal CLI
 *
 * Usage:
 *   svg-terminal generate --config terminal.yml --output terminal.svg
 *   svg-terminal init
 *   svg-terminal themes
 *   svg-terminal blocks
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generate, listBlocks, loadConfig } from './index.js';
import { themes } from './themes/index.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function main(): Promise<void> {
  switch (command) {
    case 'generate': {
      const configPath = getFlag('config') ?? 'terminal.yml';
      const outputPath = getFlag('output') ?? 'terminal.svg';

      const userConfig = loadConfig(resolve(configPath));
      const svg = await generate(userConfig);
      writeFileSync(resolve(outputPath), svg, 'utf-8');
      console.log(`Generated ${outputPath} (${(svg.length / 1024).toFixed(1)} KB)`);
      break;
    }

    case 'init': {
      const starter = `# svg-terminal configuration
# See: https://github.com/williamzujkowski/svg-terminal

theme: dracula

window:
  width: 1000
  height: 700
  title: "user@terminal:~"

terminal:
  prompt: "user@host:~$ "
  fontSize: 14

effects:
  textGlow: true
  shadow: true
  scanlines: true

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

Example:
  svg-terminal init
  svg-terminal generate --config terminal.yml --output terminal.svg
`);
    }
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
