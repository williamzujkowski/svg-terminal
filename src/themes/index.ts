import type { Theme } from '../types.js';
import { dracula } from './dracula.js';
import { nord } from './nord.js';
import { monokai } from './monokai.js';
import { amber } from './amber.js';
import { greenPhosphor } from './green-phosphor.js';
import { cyberpunk } from './cyberpunk.js';
import { solarizedDark } from './solarized-dark.js';
import { win95 } from './win95.js';
import { catppuccin } from './catppuccin.js';
import { tokyoNight } from './tokyo-night.js';
import { gruvbox } from './gruvbox.js';

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
  catppuccin,
  'tokyo-night': tokyoNight,
  gruvbox,
};

/** User-registered themes; shadow built-ins when names collide. */
const customThemes = new Map<string, Theme>();

/**
 * Register a custom theme. Mirrors registerBlock() — name shadows built-ins.
 * Throws on the reserved name "random" (which triggers daily rotation).
 */
export function registerTheme(theme: Theme): void {
  if (theme.name === 'random') {
    throw new Error(
      `"random" is a reserved theme name (it triggers the daily-rotation behavior). Pick a different name for your custom theme.`,
    );
  }
  customThemes.set(theme.name, theme);
}

/** Get a registered theme by name (custom + built-in). */
export function getTheme(name: string): Theme | undefined {
  return customThemes.get(name) ?? themes[name];
}

/** All theme names — custom first, then built-ins. */
export function listThemes(): string[] {
  const names = new Set<string>(customThemes.keys());
  for (const name of Object.keys(themes)) names.add(name);
  return Array.from(names);
}

/** All theme names available for rotation (deprecated: prefer listThemes()). */
export const THEME_NAMES = Object.keys(themes);

/** Resolve a theme by name. Supports 'random' for random selection. Throws if not found. */
export function resolveTheme(nameOrTheme: string | Theme): Theme {
  if (typeof nameOrTheme === 'object') {
    return nameOrTheme;
  }

  // 'random' — deterministic rotation based on day of year
  if (nameOrTheme === 'random') {
    const names = listThemes();
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const idx = dayOfYear % names.length;
    const selected = names[idx]!;
    console.log(`[svg-terminal] Theme rotation: day ${dayOfYear} → ${selected}`);
    return getTheme(selected)!;
  }

  const theme = getTheme(nameOrTheme);
  if (!theme) {
    const available = listThemes().join(', ');
    throw new Error(`Unknown theme "${nameOrTheme}". Available: ${available}, random`);
  }
  return theme;
}

export { dracula, nord, monokai, amber, greenPhosphor, cyberpunk, solarizedDark, win95, catppuccin, tokyoNight, gruvbox };
