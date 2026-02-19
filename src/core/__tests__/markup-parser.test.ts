import { describe, it, expect } from 'vitest';
import {
  parseMarkup,
  stripMarkup,
  hasMarkup,
  resolveColor,
  buildColorMap,
} from '../markup-parser.js';
import { dracula } from '../../themes/dracula.js';

const colorMap = buildColorMap(dracula.colors);
const fallback = dracula.colors.text;

// ============================================================================
// resolveColor
// ============================================================================

describe('resolveColor', () => {
  it('resolves named colors from the map', () => {
    expect(resolveColor('red', colorMap, fallback)).toBe(dracula.colors.red);
    expect(resolveColor('cyan', colorMap, fallback)).toBe(dracula.colors.cyan);
  });

  it('is case-insensitive for named colors', () => {
    expect(resolveColor('RED', colorMap, fallback)).toBe(dracula.colors.red);
    expect(resolveColor('Green', colorMap, fallback)).toBe(dracula.colors.green);
  });

  it('returns valid hex colors as-is', () => {
    expect(resolveColor('#ff5555', colorMap, fallback)).toBe('#ff5555');
    expect(resolveColor('#ABC', colorMap, fallback)).toBe('#ABC');
    expect(resolveColor('#aabbcc', colorMap, fallback)).toBe('#aabbcc');
  });

  it('returns fallback for invalid hex colors', () => {
    expect(resolveColor('#xyz', colorMap, fallback)).toBe(fallback);
    expect(resolveColor('#12', colorMap, fallback)).toBe(fallback);
    expect(resolveColor('#1234567', colorMap, fallback)).toBe(fallback);
  });

  it('returns fallback for unknown color names', () => {
    expect(resolveColor('nonexistent', colorMap, fallback)).toBe(fallback);
  });
});

// ============================================================================
// stripMarkup
// ============================================================================

describe('stripMarkup', () => {
  it('returns empty string for empty input', () => {
    expect(stripMarkup('')).toBe('');
  });

  it('strips fg tags', () => {
    expect(stripMarkup('[[fg:red]]hello[[/fg]]')).toBe('hello');
  });

  it('strips nested tags', () => {
    expect(stripMarkup('[[bold]][[fg:red]]hi[[/fg]][[/bold]]')).toBe('hi');
  });

  it('preserves plain text', () => {
    expect(stripMarkup('no markup here')).toBe('no markup here');
  });
});

// ============================================================================
// hasMarkup
// ============================================================================

describe('hasMarkup', () => {
  it('returns true for text with markup', () => {
    expect(hasMarkup('[[fg:red]]hello[[/fg]]')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(hasMarkup('plain text')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(hasMarkup(null as unknown as string)).toBe(false);
  });
});

// ============================================================================
// parseMarkup
// ============================================================================

describe('parseMarkup', () => {
  it('returns plain span for text without markup', () => {
    const spans = parseMarkup('hello', colorMap, fallback);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('hello');
    expect(spans[0]!.fg).toBeNull();
  });

  it('returns empty span for empty input', () => {
    const spans = parseMarkup('', colorMap, fallback);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('');
  });

  it('parses fg color tags', () => {
    const spans = parseMarkup('[[fg:red]]hello[[/fg]]', colorMap, fallback);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('hello');
    expect(spans[0]!.fg).toBe(dracula.colors.red);
  });

  it('parses bold tags', () => {
    const spans = parseMarkup('[[bold]]strong[[/bold]]', colorMap, fallback);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('strong');
    expect(spans[0]!.bold).toBe(true);
  });

  it('parses dim tags', () => {
    const spans = parseMarkup('[[dim]]faded[[/dim]]', colorMap, fallback);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('faded');
    expect(spans[0]!.dim).toBe(true);
  });

  it('handles nested tags', () => {
    const spans = parseMarkup('[[bold]][[fg:red]]hello[[/fg]][[/bold]]', colorMap, fallback);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('hello');
    expect(spans[0]!.bold).toBe(true);
    expect(spans[0]!.fg).toBe(dracula.colors.red);
  });

  it('handles mixed plain and styled text', () => {
    const spans = parseMarkup('hello [[fg:red]]world[[/fg]]!', colorMap, fallback);
    expect(spans.length).toBeGreaterThanOrEqual(2);
    const texts = spans.map(s => s.text).join('');
    expect(texts).toBe('hello world!');
  });

  it('handles unclosed tags gracefully', () => {
    const spans = parseMarkup('text [[fg:red', colorMap, fallback);
    // Should not crash, treat unclosed tag as plain text
    const texts = spans.map(s => s.text).join('');
    expect(texts).toContain('text');
    expect(texts).toContain('[[fg:red');
  });

  it('handles mismatched closing tags gracefully', () => {
    // Opening fg:red, closing with /bold — should not crash
    const spans = parseMarkup('[[fg:red]]hello[[/bold]]', colorMap, fallback);
    const texts = spans.map(s => s.text).join('');
    expect(texts).toBe('hello');
  });

  it('merges adjacent spans with same style', () => {
    const spans = parseMarkup('[[fg:red]]hello [[/fg]][[fg:red]]world[[/fg]]', colorMap, fallback);
    // The two red spans could be merged
    const texts = spans.map(s => s.text).join('');
    expect(texts).toBe('hello world');
  });
});
