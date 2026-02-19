import { describe, it, expect } from 'vitest';
import {
  resolveTyping,
  resolvePause,
  TYPING_PRESETS,
  PAUSE_PRESETS,
  DEFAULT_WINDOW,
  DEFAULT_TERMINAL,
  DEFAULT_EFFECTS,
  DEFAULT_CONFIG,
} from '../defaults.js';

describe('resolveTyping', () => {
  it('resolves preset names', () => {
    expect(resolveTyping('fast')).toBe(TYPING_PRESETS['fast']);
    expect(resolveTyping('slow')).toBe(TYPING_PRESETS['slow']);
  });

  it('returns numbers as-is', () => {
    expect(resolveTyping(500)).toBe(500);
    expect(resolveTyping(0)).toBe(0);
  });

  it('returns default for undefined', () => {
    expect(resolveTyping(undefined)).toBe(1200);
  });

  it('returns default for unknown preset', () => {
    expect(resolveTyping('nonexistent')).toBe(1200);
  });
});

describe('resolvePause', () => {
  it('resolves preset names', () => {
    expect(resolvePause('short')).toBe(PAUSE_PRESETS['short']);
    expect(resolvePause('long')).toBe(PAUSE_PRESETS['long']);
  });

  it('returns numbers as-is', () => {
    expect(resolvePause(300)).toBe(300);
  });

  it('returns default for undefined', () => {
    expect(resolvePause(undefined)).toBe(1000);
  });
});

describe('defaults', () => {
  it('has sensible window defaults', () => {
    expect(DEFAULT_WINDOW.width).toBe(1000);
    expect(DEFAULT_WINDOW.height).toBe(700);
  });

  it('has sensible terminal defaults', () => {
    expect(DEFAULT_TERMINAL.fontSize).toBe(14);
    expect(DEFAULT_TERMINAL.lineHeight).toBe(1.8);
  });

  it('has all effects enabled by default', () => {
    expect(DEFAULT_EFFECTS.textGlow).toBe(true);
    expect(DEFAULT_EFFECTS.shadow).toBe(true);
    expect(DEFAULT_EFFECTS.scanlines).toBe(true);
  });

  it('has complete config', () => {
    expect(DEFAULT_CONFIG.maxDuration).toBe(90);
    expect(DEFAULT_CONFIG.scrollDuration).toBe(100);
  });
});
