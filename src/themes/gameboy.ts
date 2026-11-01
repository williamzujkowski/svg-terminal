import type { Theme } from '../types.js';

/** Game Boy DMG — iconic 4-shade olive green 1989 handheld matrix. */
export const gameboy: Theme = {
  name: 'gameboy',
  colors: {
    text: '#0f380f',
    comment: '#306230',
    background: '#8bac0f',
    titleBarBackground: '#9bbc0f',
    titleBarText: '#0f380f',
    prompt: '#0f380f',
    cursor: '#0f380f',
    red: '#6b182a',
    green: '#1a481a',
    yellow: '#4d5c14',
    blue: '#193854',
    magenta: '#582046',
    cyan: '#1b4a4d',
    white: '#9bbc0f',
    orange: '#5a3810',
    purple: '#441c48',
    pink: '#602240',
    brightRed: '#8b1e42',
    brightGreen: '#306230',
    brightYellow: '#607218',
    brightBlue: '#255075',
    brightMagenta: '#752d5e',
    brightCyan: '#266568',
    brightWhite: '#9bbc0f',
    brightBlack: '#306230',
  },
  // Hardware-matching button accents: A (burgundy), B (dark plum), Select/Start (grey)
  buttons: {
    close: '#8b1e42',
    minimize: '#2d1537',
    maximize: '#4b4b4b',
  },
};
