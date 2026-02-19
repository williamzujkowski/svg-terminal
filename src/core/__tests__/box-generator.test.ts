import { describe, it, expect } from 'vitest';
import {
  getDisplayWidth,
  wrapText,
  padToWidth,
  truncateToWidth,
  createBox,
  createAutoBox,
  createDoubleBox,
  createRoundedBox,
  createTitledBox,
} from '../box-generator.js';

// ============================================================================
// getDisplayWidth
// ============================================================================

describe('getDisplayWidth', () => {
  it('returns 0 for empty string', () => {
    expect(getDisplayWidth('')).toBe(0);
  });

  it('returns 0 for null/undefined input', () => {
    expect(getDisplayWidth(null as unknown as string)).toBe(0);
    expect(getDisplayWidth(undefined as unknown as string)).toBe(0);
  });

  it('measures plain ASCII correctly', () => {
    expect(getDisplayWidth('hello')).toBe(5);
    expect(getDisplayWidth('abc def')).toBe(7);
  });

  it('strips ANSI escape codes before measuring', () => {
    expect(getDisplayWidth('\x1b[31mred\x1b[0m')).toBe(3);
    expect(getDisplayWidth('\x1b[1;32mbold green\x1b[0m')).toBe(10);
  });

  it('strips [[markup]] tags before measuring', () => {
    expect(getDisplayWidth('[[fg:red]]hello[[/fg]]')).toBe(5);
    expect(getDisplayWidth('[[bold]]text[[/bold]]')).toBe(4);
    expect(getDisplayWidth('[[fg:cyan]]a[[/fg]] [[fg:red]]b[[/fg]]')).toBe(3);
  });

  it('strips nested markup tags', () => {
    expect(getDisplayWidth('[[bold]][[fg:red]]hi[[/fg]][[/bold]]')).toBe(2);
  });

  it('counts emoji as double width', () => {
    expect(getDisplayWidth('🎉')).toBe(2);
    expect(getDisplayWidth('hello 🌍')).toBe(8);
    expect(getDisplayWidth('🎉🎊')).toBe(4);
  });

  it('handles mixed markup and emoji', () => {
    expect(getDisplayWidth('[[fg:green]]🎉 hi[[/fg]]')).toBe(5);
  });
});

// ============================================================================
// wrapText
// ============================================================================

describe('wrapText', () => {
  it('returns single-element array for empty string', () => {
    expect(wrapText('', 40)).toEqual(['']);
  });

  it('returns text unchanged when it fits', () => {
    expect(wrapText('hello world', 40)).toEqual(['hello world']);
  });

  it('wraps at word boundaries', () => {
    const result = wrapText('one two three four five', 10);
    for (const line of result) {
      expect(getDisplayWidth(line)).toBeLessThanOrEqual(10);
    }
    // All words should be present
    expect(result.join(' ').replace(/\s+/g, ' ').trim()).toContain('one');
    expect(result.join(' ').replace(/\s+/g, ' ').trim()).toContain('five');
  });

  it('applies indent to continuation lines only', () => {
    const result = wrapText('one two three four five six', 15, '  ');
    // First line has no indent
    expect(result[0]).not.toMatch(/^  /);
    // Continuation lines have indent
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toMatch(/^  /);
    }
  });

  it('does not double-count indent width', () => {
    // With indent "    " (4 chars) and maxWidth 20:
    // First line: up to 20 chars
    // Continuation lines: "    " + up to 16 chars of content = 20 total
    const result = wrapText('aaa bbb ccc ddd eee fff', 20, '    ');
    for (const line of result) {
      expect(getDisplayWidth(line)).toBeLessThanOrEqual(20);
    }
  });

  it('breaks long words character-by-character', () => {
    const longWord = 'abcdefghijklmnopqrstuvwxyz';
    const result = wrapText(longWord, 10);
    for (const line of result) {
      expect(getDisplayWidth(line)).toBeLessThanOrEqual(10);
    }
    // All characters should be preserved
    expect(result.join('')).toBe(longWord);
  });

  it('handles markup tags in text without breaking on them', () => {
    const result = wrapText('[[fg:red]]hello world[[/fg]]', 50);
    expect(result).toEqual(['[[fg:red]]hello world[[/fg]]']);
  });
});

// ============================================================================
// padToWidth
// ============================================================================

describe('padToWidth', () => {
  it('pads to target width', () => {
    const result = padToWidth('hi', 10);
    expect(getDisplayWidth(result)).toBe(10);
  });

  it('does not trim when already at target width', () => {
    expect(padToWidth('hello', 5)).toBe('hello');
  });

  it('handles markup text correctly', () => {
    const result = padToWidth('[[fg:red]]hi[[/fg]]', 10);
    // Display width should be 10, but string includes markup
    expect(getDisplayWidth(result)).toBe(10);
  });
});

// ============================================================================
// truncateToWidth
// ============================================================================

describe('truncateToWidth', () => {
  it('returns text unchanged when it fits', () => {
    expect(truncateToWidth('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis', () => {
    const result = truncateToWidth('hello world this is long', 15);
    expect(getDisplayWidth(result)).toBeLessThanOrEqual(15);
    expect(result).toContain('...');
  });
});

// ============================================================================
// createBox
// ============================================================================

describe('createBox', () => {
  it('creates a box with correct width', () => {
    const box = createBox({ lines: ['hello'], width: 20 });
    const boxLines = box.split('\n');
    // Top border should be exactly width characters
    expect(getDisplayWidth(boxLines[0]!)).toBe(20);
  });

  it('truncates long lines by default', () => {
    const box = createBox({ lines: ['a'.repeat(100)], width: 20 });
    const boxLines = box.split('\n');
    // Content line should fit within the box
    expect(getDisplayWidth(boxLines[1]!)).toBe(20);
  });

  it('wraps lines when wrap option is enabled', () => {
    const box = createBox({
      lines: ['this is a long line that should be wrapped within the box'],
      width: 30,
      wrap: true,
    });
    const boxLines = box.split('\n');
    // Should have more than 3 lines (top + wrapped content + bottom)
    expect(boxLines.length).toBeGreaterThan(3);
    // All lines should be same width
    for (const line of boxLines) {
      expect(getDisplayWidth(line)).toBe(30);
    }
  });

  it('adds separators at correct positions', () => {
    const box = createBox({
      lines: ['line1', 'line2', 'line3'],
      width: 20,
      separatorAfter: [0],
    });
    const boxLines = box.split('\n');
    // Line at index 2 (after top border + line1) should be a separator
    // Default style is 'double' which uses ═ and ╠/╣ for separators
    expect(boxLines[2]).toContain('╠')
  });
});

// ============================================================================
// createAutoBox
// ============================================================================

describe('createAutoBox', () => {
  it('sizes box to fit content', () => {
    const box = createAutoBox({ lines: ['short', 'a longer line here'] });
    const boxLines = box.split('\n');
    // Width should be based on longest line + borders (4 chars for border+padding)
    const longestContent = getDisplayWidth('a longer line here');
    const expectedWidth = longestContent + 4;
    expect(getDisplayWidth(boxLines[0]!)).toBe(expectedWidth);
  });

  it('respects minWidth', () => {
    const box = createAutoBox({ lines: ['hi'], minWidth: 30 });
    const boxLines = box.split('\n');
    expect(getDisplayWidth(boxLines[0]!)).toBe(30);
  });

  it('respects maxWidth and wraps', () => {
    const longLine = 'this is a very long line that exceeds the maximum width and should be wrapped';
    const box = createAutoBox({ lines: [longLine], maxWidth: 40 });
    const boxLines = box.split('\n');
    // Box should not exceed maxWidth
    expect(getDisplayWidth(boxLines[0]!)).toBeLessThanOrEqual(40);
    // Should have wrapped into multiple content lines
    expect(boxLines.length).toBeGreaterThan(3);
  });

  it('uses double style by default', () => {
    const box = createAutoBox({ lines: ['test'] });
    // Double box uses ╔ character
    expect(box).toContain('╔');
  });

  it('accepts custom style', () => {
    const box = createAutoBox({ lines: ['test'], style: 'rounded' });
    // Rounded box uses ╭ character
    expect(box).toContain('╭');
  });
});

// ============================================================================
// Convenience functions
// ============================================================================

describe('createDoubleBox', () => {
  it('creates a double-style box', () => {
    const box = createDoubleBox(['hello']);
    expect(box).toContain('╔');
    expect(box).toContain('╚');
  });
});

describe('createRoundedBox', () => {
  it('creates a rounded-style box', () => {
    const box = createRoundedBox(['hello']);
    expect(box).toContain('╭');
    expect(box).toContain('╰');
  });
});

describe('createTitledBox', () => {
  it('creates a box with title and separator', () => {
    const box = createTitledBox({ title: 'My Title', content: ['line1'] });
    expect(box).toContain('My Title');
    // Should have a separator after the title
    const boxLines = box.split('\n');
    const hasSeparator = boxLines.some((l) => l.includes('╠') || l.includes('├'));
    expect(hasSeparator).toBe(true);
  });
});
