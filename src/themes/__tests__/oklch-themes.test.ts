import { describe, it, expect } from 'vitest';
import { getTheme } from '../index.js';
import { mergeConfig } from '../../core/config.js';
import type { ThemeColors } from '../../types.js';

// The OKLCH WCAG-AAA additions (v1.2.0), sourced from
// https://williamzujkowski.github.io/oklch-terminal-themes/
const OKLCH_THEMES = [
  'modus-vivendi', 'oxocarbon', 'rose-pine', 'everforest',
  'kanagawa', 'flexoki', 'github-light', 'dayfox',
] as const;

// WCAG 2.1 relative-luminance contrast ratio.
function lin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLOTS: (keyof ThemeColors)[] = [
  'text', 'comment', 'background', 'titleBarBackground', 'titleBarText', 'prompt', 'cursor',
  'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'orange', 'purple', 'pink',
  'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite', 'brightBlack',
];

describe('OKLCH WCAG-AAA themes (#100, v1.2.0)', () => {
  for (const name of OKLCH_THEMES) {
    describe(name, () => {
      const theme = getTheme(name);

      it('is registered with all 25 color slots as valid hex', () => {
        expect(theme).toBeDefined();
        for (const slot of SLOTS) {
          expect(theme!.colors[slot], `${name}.${slot}`).toMatch(HEX);
        }
        for (const btn of ['close', 'minimize', 'maximize'] as const) {
          expect(theme!.buttons[btn]).toMatch(HEX);
        }
      });

      it('body text clears WCAG AAA (>= 7:1) on the background', () => {
        const c = theme!.colors;
        expect(contrast(c.text, c.background)).toBeGreaterThanOrEqual(7);
      });

      it('prompt, comment, and title-bar text clear WCAG AA (>= 4.5:1)', () => {
        const c = theme!.colors;
        expect(contrast(c.prompt, c.background), 'prompt').toBeGreaterThanOrEqual(4.5);
        expect(contrast(c.comment, c.background), 'comment').toBeGreaterThanOrEqual(4.5);
        expect(contrast(c.titleBarText, c.titleBarBackground), 'titlebar').toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it('default to scanlines OFF (crisp/modern), but honor an explicit override', () => {
    for (const name of OKLCH_THEMES) {
      const auto = mergeConfig({ theme: name, blocks: [{ block: 'vim-exit' }] });
      expect(auto.effects.scanlines, `${name} auto`).toBe(false);
      const overridden = mergeConfig({ theme: name, blocks: [{ block: 'vim-exit' }], effects: { scanlines: true } });
      expect(overridden.effects.scanlines, `${name} override`).toBe(true);
    }
  });

  it('do NOT auto-enable glow (modern themes stay sharp)', () => {
    for (const name of OKLCH_THEMES) {
      const cfg = mergeConfig({ theme: name, blocks: [{ block: 'vim-exit' }] });
      expect(cfg.effects.textGlow, name).toBe(false);
    }
  });
});
