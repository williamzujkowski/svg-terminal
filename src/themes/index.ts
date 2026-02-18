import type { Theme } from '../types.js';
import { dracula } from './dracula.js';
import { nord } from './nord.js';
import { monokai } from './monokai.js';

/** Built-in theme registry. */
export const themes: Record<string, Theme> = {
  dracula,
  nord,
  monokai,
};

/** Resolve a theme by name. Throws if not found. */
export function resolveTheme(nameOrTheme: string | Theme): Theme {
  if (typeof nameOrTheme === 'object') {
    return nameOrTheme;
  }
  const theme = themes[nameOrTheme];
  if (!theme) {
    const available = Object.keys(themes).join(', ');
    throw new Error(`Unknown theme "${nameOrTheme}". Available: ${available}`);
  }
  return theme;
}

export { dracula, nord, monokai };
