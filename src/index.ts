/**
 * svg-terminal — Generate animated SVG terminals for GitHub READMEs.
 *
 * @example
 * ```ts
 * import { generate } from 'svg-terminal';
 *
 * const svg = await generate({
 *   theme: 'dracula',
 *   window: { title: 'my-terminal' },
 *   blocks: [
 *     { block: 'neofetch', config: { username: 'dev', hostname: 'box' } },
 *     { block: 'custom', config: { command: 'echo hi', lines: ['Hello!'] } },
 *   ],
 * });
 * ```
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockEntry, Sequence, UserConfig } from './types.js';
import { mergeConfig } from './core/config.js';
import { resolvePause, resolveTyping } from './core/defaults.js';
import { generateSvg, generateStaticSvg } from './core/svg-generator.js';
import { getBlock, registerBuiltinBlocks } from './blocks/index.js';
import { BlockConfigError } from './core/errors.js';

// Register built-in blocks on import
registerBuiltinBlocks();

/**
 * Set by `setStrictBlockConfig(true)` (called by `--strict` in the CLI).
 * When true, unknown-key warnings for blocks without a configSchema become
 * BlockConfigError throws instead.
 */
let STRICT_BLOCK_CONFIG = false;

/** Enable strict mode globally — unknown block-config keys throw instead of warning. */
export function setStrictBlockConfig(enabled: boolean): void {
  STRICT_BLOCK_CONFIG = enabled;
}

/**
 * Validate a single block entry against its declared contract.
 * - configSchema present → parse strict; on ZodError throw BlockConfigError.
 * - allowedKeys present → warn on unknown keys (or throw under --strict).
 * - neither → no-op.
 */
function validateBlockEntry(block: Block, entry: BlockEntry, index: number): void {
  const cfg = entry.config ?? {};

  if (block.configSchema) {
    try {
      block.configSchema.parse(cfg);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues.map(i => {
          const path = i.path.length ? i.path.join('.') : '<root>';
          return `  ${path}: ${i.message}`;
        }).join('\n');
        throw new BlockConfigError(
          block.name, index,
          `Invalid config for block "${block.name}" at blocks[${index}]:\n${issues}`,
        );
      }
      throw err;
    }
    return;
  }

  if (block.allowedKeys) {
    const allow = new Set<string>([
      ...block.allowedKeys,
      // These four are universal entry-level keys handled by index.ts itself.
      'command', 'color', 'typing', 'pause',
    ]);
    const unknown = Object.keys(cfg).filter(k => !allow.has(k));
    if (unknown.length === 0) return;

    const list = unknown.join(', ');
    const known = block.allowedKeys.join(', ');
    const msg = `Unknown config key(s) [${list}] for block "${block.name}" at blocks[${index}]\n  Known keys: ${known}`;
    if (STRICT_BLOCK_CONFIG) {
      throw new BlockConfigError(block.name, index, msg);
    }
    console.warn(`[svg-terminal] warning: ${msg}`);
  }
}

/**
 * Generate an animated SVG terminal from a declarative config.
 * This is the main API entry point.
 */
export async function generate(userConfig: UserConfig): Promise<string> {
  const config = mergeConfig(userConfig);
  const sequences: Sequence[] = [];

  const context: BlockContext = {
    now: new Date(),
    config,
    variables: userConfig.variables ?? {},
  };

  for (let i = 0; i < userConfig.blocks.length; i++) {
    const entry = userConfig.blocks[i]!;
    const block = getBlock(entry.block);
    if (!block) {
      throw new Error(
        `Unknown block "${entry.block}". Register it with registerBlock() or use a built-in block.`,
      );
    }
    validateBlockEntry(block, entry, i);

    const result = await block.render(context, entry.config ?? {});

    // Command sequence — pause after typing before output appears
    sequences.push({
      type: 'command',
      content: entry.command ?? result.command,
      typingDuration: resolveTyping(entry.typing ?? result.typing),
      pause: config.animation.commandOutputPause,
    });

    // Output sequence
    sequences.push({
      type: 'output',
      content: result.lines.join('\n'),
      color: entry.color ?? result.color,
      pause: resolvePause(entry.pause ?? result.pause),
    });
  }

  return generateSvg(sequences, config);
}

/**
 * Generate a static (non-animated) SVG terminal.
 * All content is visible at full opacity with no animations.
 * Useful for accessibility fallbacks, print, and social media previews.
 */
export async function generateStatic(userConfig: UserConfig): Promise<string> {
  const config = mergeConfig(userConfig);
  const allLines: string[] = [];

  const context: BlockContext = {
    now: new Date(),
    config,
    variables: userConfig.variables ?? {},
  };

  for (let i = 0; i < userConfig.blocks.length; i++) {
    const entry = userConfig.blocks[i]!;
    const block = getBlock(entry.block);
    if (!block) {
      throw new Error(
        `Unknown block "${entry.block}". Register it with registerBlock() or use a built-in block.`,
      );
    }
    validateBlockEntry(block, entry, i);

    const result = await block.render(context, entry.config ?? {});
    const prompt = config.text.prompt;
    allLines.push(`${prompt}${entry.command ?? result.command}`);
    allLines.push(...result.lines);
  }

  return generateStaticSvg(allLines, config);
}

// Re-export public API
export { generateSvg, generateStaticSvg } from './core/svg-generator.js';
export { loadConfig, mergeConfig } from './core/config.js';
export { ConfigError, BlockConfigError } from './core/errors.js';
export { registerBlock, registerBlocks, getBlock, listBlocks, registerBuiltinBlocks } from './blocks/index.js';
export { createBox, createAutoBox, createDoubleBox, createRoundedBox, createTitledBox } from './core/box-generator.js';
export { parseMarkup, hasMarkup, stripMarkup, buildColorMap } from './core/markup-parser.js';
export { resolveTheme, themes, registerTheme, getTheme, listThemes, dracula, nord, monokai } from './themes/index.js';
export { TYPING_PRESETS, PAUSE_PRESETS, resolveTyping, resolvePause } from './core/defaults.js';
export { fetchWithTimeout, fetchJson, fetchText } from './core/http.js';
export type * from './types.js';
