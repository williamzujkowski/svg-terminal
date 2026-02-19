import { describe, it, expect } from 'vitest';
import { escapeXml, roundCoord, getTextWidth } from '../xml.js';

describe('escapeXml', () => {
  it('escapes ampersand', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
  });

  it('escapes angle brackets', () => {
    expect(escapeXml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes quotes', () => {
    expect(escapeXml('"hello" \'world\'')).toBe('&quot;hello&quot; &apos;world&apos;');
  });

  it('handles empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('leaves safe text unchanged', () => {
    expect(escapeXml('hello world 123')).toBe('hello world 123');
  });

  it('handles multiple escapes in same string', () => {
    expect(escapeXml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});

describe('roundCoord', () => {
  it('rounds to 1 decimal by default', () => {
    expect(roundCoord(1.234)).toBe(1.2);
    expect(roundCoord(1.25)).toBe(1.3);
  });

  it('rounds to specified decimals', () => {
    expect(roundCoord(1.2345, 2)).toBe(1.23);
    expect(roundCoord(1.2345, 0)).toBe(1);
  });

  it('handles whole numbers', () => {
    expect(roundCoord(5)).toBe(5);
  });
});

describe('getTextWidth', () => {
  it('calculates approximate monospace text width', () => {
    const width = getTextWidth('hello', 14);
    // 5 chars * (14 * 0.6) = 5 * 8.4 = 42
    expect(width).toBe(42);
  });

  it('returns 0 for empty string', () => {
    expect(getTextWidth('', 14)).toBe(0);
  });
});
