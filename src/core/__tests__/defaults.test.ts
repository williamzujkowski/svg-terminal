import { describe, it, expect } from 'vitest';
import {
  resolveTyping,
  resolvePause,
  TYPING_PRESETS,
  PAUSE_PRESETS,
  DEFAULT_WINDOW,
  DEFAULT_TERMINAL,
  DEFAULT_EFFECTS,
  DEFAULT_ANIMATION,
  DEFAULT_CHROME,
  DEFAULT_CONFIG,
  CHAR_WIDTH_RATIO,
  CURSOR_Y_OFFSET_RATIO,
  GLOW_BLUR_VALUES,
  SHADOW_PARAMS,
  SCANLINE_PARAMS,
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
    expect(DEFAULT_CONFIG.animation).toBeDefined();
    expect(DEFAULT_CONFIG.chrome).toBeDefined();
  });

  it('has animation defaults', () => {
    expect(DEFAULT_ANIMATION.cursorBlinkCycle).toBe(1000);
    expect(DEFAULT_ANIMATION.charAppearDuration).toBe(10);
    expect(DEFAULT_ANIMATION.outputLineStagger).toBe(50);
    expect(DEFAULT_ANIMATION.commandOutputPause).toBe(300);
    expect(DEFAULT_ANIMATION.scrollDelay).toBe(10);
    expect(DEFAULT_ANIMATION.outputEndPause).toBe(200);
    expect(DEFAULT_ANIMATION.defaultTypingDuration).toBe(2000);
    expect(DEFAULT_ANIMATION.defaultSequencePause).toBe(1000);
    expect(DEFAULT_ANIMATION.loop).toBe(true);
  });

  it('has window style and auto-height defaults', () => {
    expect(DEFAULT_WINDOW.style).toBe('macos');
    expect(DEFAULT_WINDOW.autoHeight).toBe(false);
    expect(DEFAULT_WINDOW.minHeight).toBe(300);
    expect(DEFAULT_WINDOW.maxHeight).toBe(1200);
  });

  it('has chrome defaults', () => {
    expect(DEFAULT_CHROME.titleFontSize).toBe(13);
    expect(DEFAULT_CHROME.buttonRadius).toBe(6);
    expect(DEFAULT_CHROME.buttonSpacing).toBe(20);
    expect(DEFAULT_CHROME.dimOpacity).toBe(0.6);
    expect(DEFAULT_CHROME.buttonY).toBe(16);
  });

  it('has internal constants', () => {
    expect(CHAR_WIDTH_RATIO).toBe(0.6);
    expect(CURSOR_Y_OFFSET_RATIO).toBe(-0.85);
    expect(GLOW_BLUR_VALUES).toEqual([0.2, 1.5, 3.5]);
    expect(SHADOW_PARAMS.dy).toBe(15);
    expect(SCANLINE_PARAMS.height).toBe(2);
  });
});
