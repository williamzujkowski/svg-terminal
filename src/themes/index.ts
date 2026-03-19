import type { Theme } from '../types.js';
import { dracula } from './dracula.js';
import { nord } from './nord.js';
import { monokai } from './monokai.js';
import { amber } from './amber.js';
import { greenPhosphor } from './green-phosphor.js';
import { cyberpunk } from './cyberpunk.js';
import { solarizedDark } from './solarized-dark.js';
import { win95 } from './win95.js';

/** Built-in theme registry. */
export const themes: Record<string, Theme> = {
  dracula,
  nord,
  monokai,
  amber,
  'green-phosphor': greenPhosphor,
  cyberpunk,
  'solarized-dark': solarizedDark,
  win95,
};

/** All theme names available for rotation. */
export const THEME_NAMES = Object.keys(themes);

/** Resolve a theme by name. Supports 'random' for random selection. Throws if not found. */
export function resolveTheme(nameOrTheme: string | Theme): Theme {
  if (typeof nameOrTheme === 'object') {
    return nameOrTheme;
  }

  // 'random' — deterministic rotation based on day of year
  if (nameOrTheme === 'random') {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const idx = dayOfYear % THEME_NAMES.length;
    const selected = THEME_NAMES[idx]!;
    console.log(`[svg-terminal] Theme rotation: day ${dayOfYear} → ${selected}`);
    return themes[selected]!;
  }

  const theme = themes[nameOrTheme];
  if (!theme) {
    const available = Object.keys(themes).join(', ');
    throw new Error(`Unknown theme "${nameOrTheme}". Available: ${available}, random`);
  }
  return theme;
}

export { dracula, nord, monokai, amber, greenPhosphor, cyberpunk, solarizedDark, win95 };
