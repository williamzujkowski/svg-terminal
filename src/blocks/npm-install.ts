/**
 * npm-install block — web dev humor about dependency hell.
 */

import type { Block, BlockResult } from '../types.js';

/** npm install joke block. */
export const npmInstallBlock: Block = {
  name: 'npm-install',
  description: 'Display a humorous npm install dependency tree',

  render(_context, config: Record<string, unknown>): BlockResult {
    const pkg = (config['package'] as string) ?? 'left-pad';

    const lines = [
      `added 847 packages in 42.0s`,
      '',
      'Dependencies resolved:',
      `├── ${pkg}@1.0.0`,
      '│   ├── is-string@1.0.0',
      '│   │   ├── is-object@1.0.0',
      '│   │   │   ├── is-thing@1.0.0',
      '│   │   │   │   └── is-anything@1.0.0',
      '│   │   │   │       └── universe@∞',
      '│   └── string-utils@1.0.0',
      '│       └── ... 842 more packages',
      '│',
      '[[fg:yellow]]⚠ 3 vulnerabilities (1 moderate, 2 high)[[/fg]]',
      '  Run `npm audit fix` to fix them',
      '',
      `Package size: 2.3 MB for a function that pads strings`,
      'Worth it? [[fg:red]]Absolutely not.[[/fg]] Did we do it anyway? [[fg:green]]Yes.[[/fg]]',
    ];

    return {
      command: (config['command'] as string) ?? `npm install ${pkg}`,
      lines,
      typing: 'medium',
      pause: 'long',
    };
  },
};
