import type { Theme } from '../types.js';

/** Warm forest green, cozy low-glare. OKLCH-derived, WCAG-AAA body text. */
export const everforest: Theme = {
  name: 'everforest',
  colors: {
    text: '#d3c6aa',
    comment: '#a6b0a0',
    background: '#1e2326',
    titleBarBackground: '#2e3232',
    titleBarText: '#d3c6aa',
    prompt: '#a7c080',
    cursor: '#e69875',
    red: '#e67e80',
    green: '#a7c080',
    yellow: '#dbbc7f',
    blue: '#7fbbb3',
    magenta: '#d699b6',
    cyan: '#83c092',
    white: '#f2efdf',
    orange: '#e09d80',
    purple: '#d699b6',
    pink: '#df69ba',
    brightRed: '#f85552',
    brightGreen: '#8da101',
    brightYellow: '#dfa000',
    brightBlue: '#3a94c5',
    brightMagenta: '#df69ba',
    brightCyan: '#35a77c',
    brightWhite: '#fffbef',
    brightBlack: '#a6b0a0',
  },
  buttons: {
    close: '#ff5f57',
    minimize: '#ffbd2e',
    maximize: '#28ca42',
  },
};
