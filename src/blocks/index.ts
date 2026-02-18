/**
 * Built-in blocks — register all default block types.
 */

import { registerBlocks } from './registry.js';
import { customBlock } from './custom.js';
import { neofetchBlock } from './neofetch.js';
import { fortuneBlock } from './fortune.js';
import { motdBlock } from './motd.js';
import { dadJokeBlock } from './dad-joke.js';
import { htopBlock } from './htop.js';
import { profileBlock } from './profile.js';
import { goodbyeBlock } from './goodbye.js';
import { npmInstallBlock } from './npm-install.js';
import { blogPostBlock } from './blog-post.js';
import { nationalDayBlock } from './national-day.js';
import { systemctlBlock } from './systemctl.js';

/** Register all built-in blocks. */
export function registerBuiltinBlocks(): void {
  registerBlocks([
    customBlock,
    neofetchBlock,
    fortuneBlock,
    motdBlock,
    dadJokeBlock,
    htopBlock,
    profileBlock,
    goodbyeBlock,
    npmInstallBlock,
    blogPostBlock,
    nationalDayBlock,
    systemctlBlock,
  ]);
}

export { registerBlock, registerBlocks, getBlock, listBlocks } from './registry.js';
export { customBlock } from './custom.js';
export { neofetchBlock } from './neofetch.js';
export { fortuneBlock } from './fortune.js';
export { motdBlock } from './motd.js';
export { dadJokeBlock } from './dad-joke.js';
export { htopBlock } from './htop.js';
export { profileBlock } from './profile.js';
export { goodbyeBlock } from './goodbye.js';
export { npmInstallBlock } from './npm-install.js';
export { blogPostBlock } from './blog-post.js';
export { nationalDayBlock } from './national-day.js';
export { systemctlBlock } from './systemctl.js';
