import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../config.js';
import type { UserConfig } from '../../types.js';

describe('mergeConfig', () => {
  const minimal: UserConfig = {
    blocks: [],
  };

  it('uses defaults when no overrides provided', () => {
    const config = mergeConfig(minimal);
    expect(config.window.width).toBe(1000);
    expect(config.window.height).toBe(700);
    expect(config.text.fontSize).toBe(14);
    expect(config.maxDuration).toBe(90);
    expect(config.scrollDuration).toBe(100);
  });

  it('applies theme by name', () => {
    const config = mergeConfig({ ...minimal, theme: 'nord' });
    expect(config.theme.name).toBe('nord');
  });

  it('defaults to dracula theme', () => {
    const config = mergeConfig(minimal);
    expect(config.theme.name).toBe('dracula');
  });

  it('overrides window dimensions', () => {
    const config = mergeConfig({ ...minimal, window: { width: 800, height: 600 } });
    expect(config.window.width).toBe(800);
    expect(config.window.height).toBe(600);
    // Non-overridden values use defaults
    expect(config.window.borderRadius).toBe(12);
  });

  it('overrides maxDuration', () => {
    const config = mergeConfig({ ...minimal, maxDuration: 120 });
    expect(config.maxDuration).toBe(120);
  });

  it('overrides scrollDuration', () => {
    const config = mergeConfig({ ...minimal, scrollDuration: 200 });
    expect(config.scrollDuration).toBe(200);
  });

  it('overrides effects', () => {
    const config = mergeConfig({ ...minimal, effects: { scanlines: false } });
    expect(config.effects.scanlines).toBe(false);
    expect(config.effects.textGlow).toBe(true); // default preserved
  });
});
