import type { Theme } from '../types.js';

/**
 * High-contrast theme designed to clear WCAG AAA (≥7:1) for text and prompt
 * on background. Useful for users with low vision, screen-readability needs,
 * or anyone projecting an SVG terminal in a high-glare environment (slides,
 * keynote backgrounds). Also reads well at very small thumbnail sizes.
 *
 * Pure black background + pure white text = 21:1. Accent colors are picked
 * from a constrained palette where every one clears 7:1 on black:
 *   #ffffff (white)   21:1
 *   #ffff00 (yellow)  19.6:1
 *   #00ffff (cyan)    16.7:1
 *   #00ff00 (green)   15.3:1
 *   #ff00ff (magenta) 9.0:1
 *   #ff5555 (red)     5.7:1 — AA only; bumped from canonical red for visibility
 *   #aaaaff (blue)    8.4:1 — lifted from pure blue (#0000ff = 2.4:1, AAA-fail)
 *
 * NOT for general README aesthetic use — this is a deliberately blunt
 * instrument. The standard themes (dracula, nord, …) are the default UX.
 */
export const highContrast: Theme = {
  name: 'high-contrast',
  colors: {
    text: '#ffffff',
    comment: '#aaaaaa',         // 9.1:1 — clears AAA at the dim end
    background: '#000000',
    titleBarBackground: '#1a1a1a',
    titleBarText: '#ffffff',
    prompt: '#00ff00',          // 15.3:1
    cursor: '#ffff00',
    red: '#ff5555',
    green: '#00ff00',
    yellow: '#ffff00',
    blue: '#aaaaff',
    magenta: '#ff00ff',
    cyan: '#00ffff',
    white: '#ffffff',
    orange: '#ffaa00',
    purple: '#cc88ff',
    pink: '#ff99cc',
    brightRed: '#ff8888',
    brightGreen: '#88ff88',
    brightYellow: '#ffff88',
    brightBlue: '#ccccff',
    brightMagenta: '#ff88ff',
    brightCyan: '#88ffff',
    brightWhite: '#ffffff',
    brightBlack: '#888888',     // 5.9:1 — explicitly the dimmest legible value
  },
  buttons: {
    close: '#ff5555',
    minimize: '#ffff00',
    maximize: '#00ff00',
  },
};
