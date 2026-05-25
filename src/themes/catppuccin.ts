import type { Theme } from '../types.js';

/** Catppuccin Mocha — https://catppuccin.com/palette (dark variant) */
export const catppuccin: Theme = {
  name: 'catppuccin',
  colors: {
    text: '#cdd6f4',          // Text
    comment: '#9399b2',        // Overlay2 — lifted from canonical Surface2 (#585b70 = 3.0:1 on base) to clear AA
    background: '#1e1e2e',     // Base
    titleBarBackground: '#181825', // Mantle
    titleBarText: '#cdd6f4',   // Text
    prompt: '#a6e3a1',         // Green
    cursor: '#f5e0dc',         // Rosewater
    red: '#f38ba8',            // Red
    green: '#a6e3a1',          // Green
    yellow: '#f9e2af',         // Yellow
    blue: '#89b4fa',           // Blue
    magenta: '#cba6f7',        // Mauve
    cyan: '#94e2d5',           // Teal
    white: '#bac2de',          // Subtext1
    orange: '#fab387',         // Peach
    purple: '#cba6f7',         // Mauve
    pink: '#f5c2e7',           // Pink
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#cba6f7',
    brightCyan: '#94e2d5',
    brightWhite: '#a6adc8',    // Subtext0
    brightBlack: '#585b70',    // Surface2
  },
  buttons: {
    close: '#f38ba8',
    minimize: '#f9e2af',
    maximize: '#a6e3a1',
  },
};
