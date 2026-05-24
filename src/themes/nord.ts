import type { Theme } from '../types.js';

/** Nord color theme — https://www.nordtheme.com/ */
export const nord: Theme = {
  name: 'nord',
  colors: {
    text: '#d8dee9',
    // Upstream Nord uses #4c566a (Polar Night 3) — visually invisible on the
    // #2e3440 terminal background (~1.7:1). Lifted to a Polar Night / Snow Storm
    // midpoint so [[fg:comment]] / [[dim]] text stays legible.
    comment: '#7c8ba8',
    background: '#2e3440',
    titleBarBackground: '#3b4252',
    titleBarText: '#d8dee9',
    prompt: '#a3be8c',
    cursor: '#88c0d0',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#5e81ac',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#eceff4',
    orange: '#d08770',
    purple: '#b48ead',
    pink: '#b48ead',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4',
    brightBlack: '#4c566a',
  },
  buttons: {
    close: '#bf616a',
    minimize: '#ebcb8b',
    maximize: '#a3be8c',
  },
};
