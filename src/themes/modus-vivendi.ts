import type { Theme } from '../types.js';

/** Maximally-legible neutral dark (Protesilaos, WCAG-AAA by design). OKLCH-derived, WCAG-AAA body text. */
export const modusVivendi: Theme = {
  name: 'modus-vivendi',
  colors: {
    text: '#ffffff',
    comment: '#767676',
    background: '#000000',
    titleBarBackground: '#171717',
    titleBarText: '#ffffff',
    prompt: '#6ae4b9',
    cursor: '#ffffff',
    red: '#ff5f59',
    green: '#44bc44',
    yellow: '#d0bc00',
    blue: '#2fafff',
    magenta: '#feacd0',
    cyan: '#00d3d0',
    white: '#a6a6a6',
    orange: '#e88e2c',
    purple: '#feacd0',
    pink: '#b6a0ff',
    brightRed: '#ff7f9f',
    brightGreen: '#00c06f',
    brightYellow: '#fec43f',
    brightBlue: '#79a8ff',
    brightMagenta: '#b6a0ff',
    brightCyan: '#6ae4b9',
    brightWhite: '#ffffff',
    brightBlack: '#595959',
  },
  buttons: {
    close: '#ff5f57',
    minimize: '#ffbd2e',
    maximize: '#28ca42',
  },
};
