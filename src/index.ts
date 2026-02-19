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

import type { BlockContext, Sequence, UserConfig } from './types.js';
import { mergeConfig } from './core/config.js';
import { resolvePause, resolveTyping } from './core/defaults.js';
import { generateSvg } from './core/svg-generator.js';
import { getBlock, registerBuiltinBlocks } from './blocks/index.js';

// Register built-in blocks on import
registerBuiltinBlocks();

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

  for (const entry of userConfig.blocks) {
    const block = getBlock(entry.block);
    if (!block) {
      throw new Error(
        `Unknown block "${entry.block}". Register it with registerBlock() or use a built-in block.`,
      );
    }

    const result = await block.render(context, entry.config ?? {});

    // Command sequence — brief pause after typing before output appears
    sequences.push({
      type: 'command',
      content: entry.command ?? result.command,
      typingDuration: resolveTyping(entry.typing ?? result.typing),
      pause: resolvePause('minimal'),
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

// Re-export public API
export { generateSvg } from './core/svg-generator.js';
export { loadConfig, mergeConfig } from './core/config.js';
export { registerBlock, registerBlocks, getBlock, listBlocks, registerBuiltinBlocks } from './blocks/index.js';
export { createBox, createAutoBox, createDoubleBox, createRoundedBox, createTitledBox } from './core/box-generator.js';
export { parseMarkup, hasMarkup, stripMarkup, buildColorMap } from './core/markup-parser.js';
export { resolveTheme, themes, dracula, nord, monokai } from './themes/index.js';
export { TYPING_PRESETS, PAUSE_PRESETS, resolveTyping, resolvePause } from './core/defaults.js';
export type * from './types.js';
