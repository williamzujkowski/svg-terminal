import { describe, expect, it } from 'vitest';
import { createBox } from '../box-generator.js';
import { renderBoxRow } from '../box-renderer.js';
import type { BoxStyle } from '../../types.js';

const render = (row: string) => renderBoxRow(row, { cyan: '#00ffff' }, '#ffffff', 14, 25.2, 0.6);

describe('font-independent box rendering', () => {
  it.each<BoxStyle>(['single', 'double', 'rounded', 'heavy', 'dashed'])('joins every row of %s boxes', style => {
    const rows = createBox({ style, width: 20, lines: ['hello', 'world'], separatorAfter: [0] }).split('\n');
    const rendered = rows.map(render);
    expect(rendered.every(row => row?.includes('<path'))).toBe(true);
    // Both sides of each interior row reach the midpoint to adjacent rows.
    expect(rendered[1]).toContain(' -17.5V7.7');
    expect(rendered[0]).toContain(' 7.7V');
    expect(rendered.at(-1)).toContain(' -17.5V');
  });

  it('keeps identical border positions across markup and wide glyphs', () => {
    const rows = createBox({ width: 20, lines: ['[[fg:cyan]][[bold]]🚀 hello[[/bold]][[/fg]]', 'plain'] }).split('\n');
    const colored = render(rows[1]!);
    const plain = render(rows[2]!);
    expect(colored?.match(/ d="([^"]+)"/)?.[1]).toBe(plain?.match(/ d="([^"]+)"/)?.[1]);
    expect(colored).toContain('x="16.8" fill="#00ffff" textLength="67.2"');
    expect(colored).toContain('font-weight="bold"');
    expect(colored).not.toContain('║');
  });

  it('preserves ordinary text and partial box drawing art', () => {
    for (const row of ['hello', '│ branch', '┌─ title ─┐', '  ███  ', '']) expect(render(row)).toBeUndefined();
  });

  it('escapes content and preserves dim borders', () => {
    expect(render('[[dim]]│ <&> │[[/dim]]')).toContain('opacity="0.6"');
    expect(render('│ <&> │')).toContain('&lt;&amp;&gt;');
  });
});
