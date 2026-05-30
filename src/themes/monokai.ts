import type { Theme } from '../types.js';

/** Monokai Pro color theme */
export const monokai: Theme = {
  name: 'monokai',
  colors: {
    text: '#f8f8f2',
    comment: '#75715e',
    background: '#272822',
    titleBarBackground: '#1e1f1c',
    // Quieter title text (canonical Monokai comment color) so the chrome
    // reads differently from dracula at gallery-thumbnail size. Both themes
    // ship with the same macOS chrome + similar warm-dark backgrounds; the
    // title color is the cheapest place to differentiate.
    titleBarText: '#75715e',
    prompt: '#a6e22e',
    cursor: '#f8f8f2',
    red: '#fa4a8a',
    green: '#a6e22e',
    yellow: '#e6db74',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#66d9ef',
    white: '#f8f8f2',
    orange: '#fd971f',
    purple: '#ae81ff',
    pink: '#f92672',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#e6db74',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#66d9ef',
    brightWhite: '#f8f8f0',
    brightBlack: '#75715e',
  },
  buttons: {
    close: '#f92672',
    minimize: '#e6db74',
    maximize: '#a6e22e',
  },
};
