/**
 * Built-in blocks — register all default block types.
 */

import { registerBlocks } from './registry.js';
import { customBlock } from './custom.js';
import { neofetchBlock } from './neofetch.js';
import { fortuneBlock } from './fortune.js';

/** Register all built-in blocks. */
export function registerBuiltinBlocks(): void {
  registerBlocks([
    customBlock,
    neofetchBlock,
    fortuneBlock,
  ]);
}

export { registerBlock, registerBlocks, getBlock, listBlocks } from './registry.js';
export { customBlock } from './custom.js';
export { neofetchBlock } from './neofetch.js';
export { fortuneBlock } from './fortune.js';
