import type { Theme } from '../types.js';

/** Cyberpunk — neon on dark (Night City aesthetic) */
export const cyberpunk: Theme = {
  name: 'cyberpunk',
  colors: {
    text: '#e0e0ff',
    comment: '#6060a0',
    background: '#0a0014',
    titleBarBackground: '#150028',
    // Switched from canonical hot-pink #ff0080 to body text color. Saturated
    // hot-pink on deep violet passes WCAG AA (~5.24:1) but visually buzzes
    // (perceptual vibration on the saturated boundary). Body color reads as
    // part of the chrome instead of a glow accent.
    titleBarText: '#e0e0ff',
    prompt: '#ff0080',
    cursor: '#00ffff',
    red: '#ff0055',
    green: '#00ff88',
    yellow: '#ffff00',
    blue: '#0088ff',
    magenta: '#ff00ff',
    cyan: '#00ffff',
    white: '#ffffff',
    orange: '#ff8800',
    purple: '#aa00ff',
    pink: '#ff0080',
    brightRed: '#ff3377',
    brightGreen: '#33ffaa',
    brightYellow: '#ffff55',
    brightBlue: '#33aaff',
    brightMagenta: '#ff55ff',
    brightCyan: '#55ffff',
    brightWhite: '#ffffff',
    brightBlack: '#404060',
  },
  buttons: {
    close: '#ff0055',
    minimize: '#ffff00',
    maximize: '#00ff88',
  },
};
