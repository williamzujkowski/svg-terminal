import type { Theme } from '../types.js';

/** Gruvbox Dark (medium) — https://github.com/morhetz/gruvbox */
export const gruvbox: Theme = {
  name: 'gruvbox',
  colors: {
    text: '#ebdbb2',           // fg
    comment: '#a89984',         // gray (canonical) — passes AA (~4.9:1) on bg0
    background: '#282828',      // bg0
    titleBarBackground: '#1d2021', // bg0_h (hard variant — slightly darker chrome)
    titleBarText: '#ebdbb2',
    prompt: '#b8bb26',          // bright_green
    cursor: '#fabd2f',          // bright_yellow
    red: '#cc241d',             // red
    green: '#98971a',           // green
    yellow: '#d79921',          // yellow
    blue: '#458588',            // blue
    magenta: '#b16286',         // purple
    cyan: '#689d6a',            // aqua
    white: '#a89984',           // gray
    orange: '#d65d0e',          // orange
    purple: '#b16286',          // purple
    pink: '#fb4934',            // bright_red (closest to pink in the palette)
    brightRed: '#fb4934',
    brightGreen: '#b8bb26',
    brightYellow: '#fabd2f',
    brightBlue: '#83a598',
    brightMagenta: '#d3869b',
    brightCyan: '#8ec07c',
    brightWhite: '#ebdbb2',
    brightBlack: '#928374',
  },
  buttons: {
    close: '#cc241d',
    minimize: '#d79921',
    maximize: '#98971a',
  },
};
