import type { Theme } from '../types.js';

/** Green Phosphor — classic hacker terminal (Matrix/Mr. Robot aesthetic) */
export const greenPhosphor: Theme = {
  name: 'green-phosphor',
  colors: {
    text: '#00ff41',
    comment: '#008020',
    background: '#001100',
    titleBarBackground: '#002200',
    titleBarText: '#00ff41',
    prompt: '#33ff77',
    cursor: '#33ff77',
    red: '#00cc33',
    green: '#00ff41',
    yellow: '#66ff66',
    blue: '#00cc66',
    magenta: '#00ff88',
    cyan: '#00ffaa',
    white: '#aaffaa',
    orange: '#33ff33',
    purple: '#00dd55',
    pink: '#00ff77',
    brightRed: '#44ff44',
    brightGreen: '#55ff77',
    brightYellow: '#88ff88',
    brightBlue: '#33dd88',
    brightMagenta: '#44ffaa',
    brightCyan: '#66ffcc',
    brightWhite: '#ccffcc',
    brightBlack: '#006600',
  },
  // Canonical macOS triad — same rationale as amber. Three slightly-
  // different greens were unreadable as window controls.
  buttons: {
    close: '#ff5f57',
    minimize: '#ffbd2e',
    maximize: '#28ca42',
  },
};
