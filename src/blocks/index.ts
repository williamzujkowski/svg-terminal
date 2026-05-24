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
import { weatherBlock } from './weather.js';
import { githubStatsBlock } from './github-stats.js';
import { quoteBlock } from './quote.js';
import { funFactBlock } from './fun-fact.js';
import { vimExitBlock } from './vim-exit.js';
import { sudoSandwichBlock } from './sudo-sandwich.js';
import { rmRfBlock } from './rm-rf.js';
import { forkBombBlock } from './fork-bomb.js';
import { kernelPanicBlock } from './kernel-panic.js';
import { segfaultBlock } from './segfault.js';

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
    weatherBlock,
    githubStatsBlock,
    quoteBlock,
    funFactBlock,
    vimExitBlock,
    sudoSandwichBlock,
    rmRfBlock,
    forkBombBlock,
    kernelPanicBlock,
    segfaultBlock,
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
export { weatherBlock } from './weather.js';
export { githubStatsBlock } from './github-stats.js';
export { quoteBlock } from './quote.js';
export { funFactBlock } from './fun-fact.js';
export { vimExitBlock } from './vim-exit.js';
export { sudoSandwichBlock } from './sudo-sandwich.js';
export { rmRfBlock } from './rm-rf.js';
export { forkBombBlock } from './fork-bomb.js';
export { kernelPanicBlock } from './kernel-panic.js';
export { segfaultBlock } from './segfault.js';
