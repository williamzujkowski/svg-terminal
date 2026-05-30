import type { Theme } from '../types.js';

/** Hokusai ink-wash: indigo, sand, wave-crest. OKLCH-derived, WCAG-AAA body text. */
export const kanagawa: Theme = {
  name: 'kanagawa',
  colors: {
    text: '#dcd7ba',
    comment: '#8c8a7d',
    background: '#1f1f28',
    titleBarBackground: '#303035',
    titleBarText: '#dcd7ba',
    prompt: '#98bb6c',
    cursor: '#dcd7ba',
    red: '#c34043',
    green: '#76946a',
    yellow: '#c0a36e',
    blue: '#7e9cd8',
    magenta: '#957fb8',
    cyan: '#6a9589',
    white: '#c8c093',
    orange: '#c27258',
    purple: '#957fb8',
    pink: '#938aa9',
    brightRed: '#e82424',
    brightGreen: '#98bb6c',
    brightYellow: '#e6c384',
    brightBlue: '#7fb4ca',
    brightMagenta: '#938aa9',
    brightCyan: '#7aa89f',
    brightWhite: '#dcd7ba',
    brightBlack: '#727169',
  },
  buttons: {
    close: '#ff5f57',
    minimize: '#ffbd2e',
    maximize: '#28ca42',
  },
};
