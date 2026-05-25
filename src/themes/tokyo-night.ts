import type { Theme } from '../types.js';

/** Tokyo Night — https://github.com/folke/tokyonight.nvim (default storm variant) */
export const tokyoNight: Theme = {
  name: 'tokyo-night',
  colors: {
    text: '#c0caf5',
    comment: '#7986b7',         // Lifted from canonical #565f89 (~3.5:1) to clear AA on bg
    background: '#1a1b26',
    titleBarBackground: '#16161e',
    titleBarText: '#c0caf5',
    prompt: '#9ece6a',          // green
    cursor: '#7aa2f7',          // blue
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    orange: '#ff9e64',
    purple: '#bb9af7',
    pink: '#f7768e',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
    brightBlack: '#414868',
  },
  buttons: {
    close: '#f7768e',
    minimize: '#e0af68',
    maximize: '#9ece6a',
  },
};
