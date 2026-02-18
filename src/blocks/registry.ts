/**
 * Block registry — manages available block types.
 * Blocks are self-contained terminal content modules.
 */

import type { Block } from '../types.js';

const registry = new Map<string, Block>();

/** Register a block type. */
export function registerBlock(block: Block): void {
  registry.set(block.name, block);
}

/** Get a registered block by name. */
export function getBlock(name: string): Block | undefined {
  return registry.get(name);
}

/** Get all registered block names. */
export function listBlocks(): string[] {
  return Array.from(registry.keys());
}

/** Register multiple blocks at once. */
export function registerBlocks(blocks: Block[]): void {
  for (const block of blocks) {
    registerBlock(block);
  }
}
