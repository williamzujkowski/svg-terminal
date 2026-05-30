import type { Theme } from '../types.js';

/** Solarized Dark — Ethan Schoonover's precision-designed color scheme */
export const solarizedDark: Theme = {
  name: 'solarized-dark',
  colors: {
    text: '#839496',
    // Solarized's canonical base01 (#586e75) fails WCAG AA on base03 by a
    // wide margin (2.79:1; need 4.5). Lifted to a slightly brighter base01-ish
    // value that clears AA while staying in the Solarized hue family.
    comment: '#7d9499',
    background: '#002b36',
    titleBarBackground: '#073642',
    titleBarText: '#93a1a1',
    // Solarized's canonical blue (#268bd2) also fails AA on base03 (4.08:1).
    // Lifted to a brighter Solarized-family blue.
    prompt: '#4eb3e8',
    cursor: '#2aa198',
    red: '#e66663',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    orange: '#cb4b16',
    purple: '#6c71c4',
    pink: '#d33682',
    brightRed: '#cb4b16',
    brightGreen: '#859900',
    brightYellow: '#b58900',
    brightBlue: '#268bd2',
    brightMagenta: '#6c71c4',
    brightCyan: '#2aa198',
    brightWhite: '#fdf6e3',
    brightBlack: '#657b83',
  },
  buttons: {
    close: '#dc322f',
    minimize: '#b58900',
    maximize: '#859900',
  },
};
