import type { Theme } from '../types.js';

/** Amber CRT — classic 1980s phosphor terminal (VT100/DEC aesthetic) */
export const amber: Theme = {
  name: 'amber',
  colors: {
    text: '#ffb000',
    comment: '#996600',
    background: '#1a0f00',
    titleBarBackground: '#2a1a00',
    titleBarText: '#ffb000',
    prompt: '#ffd700',
    cursor: '#ffd700',
    red: '#ff6600',
    green: '#ffb000',
    yellow: '#ffd700',
    blue: '#cc8800',
    magenta: '#ff8c00',
    cyan: '#ffcc00',
    white: '#ffe0a0',
    orange: '#ff9900',
    purple: '#cc7700',
    pink: '#ff8c00',
    brightRed: '#ff8800',
    brightGreen: '#ffc000',
    brightYellow: '#ffe000',
    brightBlue: '#ddaa00',
    brightMagenta: '#ffaa00',
    brightCyan: '#ffdd00',
    brightWhite: '#fff0c0',
    brightBlack: '#664400',
  },
  buttons: {
    close: '#ff8800',
    minimize: '#ffaa00',
    maximize: '#ffcc00',
  },
};
