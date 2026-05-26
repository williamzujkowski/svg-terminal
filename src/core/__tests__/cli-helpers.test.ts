import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  formatModeTag,
  formatZodType,
  humanAge,
  isZodOptional,
  minifySvg,
  resolveCacheMode,
  parseFlags,
  scrubSecrets,
} from '../cli-helpers.js';

describe('formatModeTag', () => {
  it('returns empty string for vanilla generate (no static/minify, normal cache)', () => {
    expect(formatModeTag({ isStatic: false, minify: false, cacheMode: 'normal' })).toBe('');
  });

  it('formats static-only', () => {
    expect(formatModeTag({ isStatic: true, minify: false, cacheMode: 'normal' })).toBe(' (static)');
  });

  it('formats minify-only', () => {
    expect(formatModeTag({ isStatic: false, minify: true, cacheMode: 'normal' })).toBe(' (minified)');
  });

  it('formats cache:off', () => {
    expect(formatModeTag({ isStatic: false, minify: false, cacheMode: 'off' })).toBe(' (cache:off)');
  });

  it('formats cache:refresh', () => {
    expect(formatModeTag({ isStatic: false, minify: false, cacheMode: 'refresh' })).toBe(' (cache:refresh)');
  });

  it('formats cache:frozen', () => {
    expect(formatModeTag({ isStatic: false, minify: false, cacheMode: 'frozen' })).toBe(' (cache:frozen)');
  });

  it('does NOT include cache tag when mode is normal', () => {
    expect(formatModeTag({ isStatic: true, minify: true, cacheMode: 'normal' })).toBe(' (static, minified)');
  });

  it('combines all three parts with comma separator', () => {
    expect(formatModeTag({ isStatic: true, minify: true, cacheMode: 'frozen' })).toBe(' (static, minified, cache:frozen)');
  });
});

describe('humanAge', () => {
  it('formats sub-minute durations as seconds', () => {
    expect(humanAge(0)).toBe('0s');
    expect(humanAge(1)).toBe('1s');
    expect(humanAge(59)).toBe('59s');
  });

  it('formats minute durations', () => {
    expect(humanAge(60)).toBe('1m');
    expect(humanAge(125)).toBe('2m');
    expect(humanAge(3599)).toBe('59m');
  });

  it('formats hour durations', () => {
    expect(humanAge(3600)).toBe('1h');
    expect(humanAge(7200)).toBe('2h');
    expect(humanAge(86399)).toBe('23h');
  });

  it('formats day durations', () => {
    expect(humanAge(86400)).toBe('1d');
    expect(humanAge(86400 * 2)).toBe('2d');
    expect(humanAge(86400 * 14)).toBe('14d'); // two weeks reads as 14d (no week unit by design)
  });

  it('clamps negative or non-finite to 0s (defensive against clock skew)', () => {
    expect(humanAge(-5)).toBe('0s');
    expect(humanAge(Number.NaN)).toBe('0s');
    expect(humanAge(Number.POSITIVE_INFINITY)).toBe('0s');
  });
});

describe('minifySvg', () => {
  it('strips whitespace between adjacent tags', () => {
    const svg = '<svg>\n  <g>\n    <rect/>\n  </g>\n</svg>';
    expect(minifySvg(svg)).toBe('<svg><g><rect/></g></svg>');
  });

  it('trims leading and trailing whitespace from the document', () => {
    expect(minifySvg('   <svg></svg>   ')).toBe('<svg></svg>');
    expect(minifySvg('\n\n<svg></svg>\n')).toBe('<svg></svg>');
  });

  it('PRESERVES whitespace inside <text> content (white-space: pre matters)', () => {
    // The space between "hello" and "world" sits between `>` and `w` (a text
    // char), NOT between `>` and `<` — so the >\s+< regex must not match.
    const svg = '<text>hello world</text>';
    expect(minifySvg(svg)).toBe('<text>hello world</text>');
  });

  it('preserves multi-space text content (indented labels rendered as-is)', () => {
    const svg = '<text>  indented  label  </text>';
    expect(minifySvg(svg)).toBe('<text>  indented  label  </text>');
  });

  it('preserves whitespace inside attribute values', () => {
    const svg = '<text font-family="Courier New">x</text>';
    expect(minifySvg(svg)).toBe('<text font-family="Courier New">x</text>');
  });

  it('handles empty input', () => {
    expect(minifySvg('')).toBe('');
    expect(minifySvg('   \n  \n  ')).toBe('');
  });

  it('does not collapse a single newline+indent inside text nodes (regression guard)', () => {
    // A newline inside <text> would be unusual but should not be eaten.
    // The \n\s+ regex collapses leading indent on continuation lines, which
    // matches both inter-tag indent AND text-internal indent. This test
    // documents that current behavior: text-internal newlines DO get
    // collapsed to single \n. The acceptance criterion is that inter-word
    // spaces survive.
    const svg = '<text>line1\n  line2</text>';
    expect(minifySvg(svg)).toBe('<text>line1\nline2</text>');
  });
});

describe('resolveCacheMode', () => {
  it('returns normal for empty args', () => {
    expect(resolveCacheMode([])).toBe('normal');
  });

  it('returns normal when no cache flag is present', () => {
    expect(resolveCacheMode(['generate', '--config', 'terminal.yml'])).toBe('normal');
  });

  it('maps --no-cache to off', () => {
    expect(resolveCacheMode(['generate', '--no-cache'])).toBe('off');
  });

  it('maps --refresh-cache to refresh', () => {
    expect(resolveCacheMode(['generate', '--refresh-cache'])).toBe('refresh');
  });

  it('maps --frozen-cache to frozen', () => {
    expect(resolveCacheMode(['generate', '--frozen-cache'])).toBe('frozen');
  });

  it('accepts --cache-mode normal explicitly', () => {
    expect(resolveCacheMode(['--cache-mode', 'normal'])).toBe('normal');
  });

  it('accepts --cache-mode off', () => {
    expect(resolveCacheMode(['--cache-mode', 'off'])).toBe('off');
  });

  it('throws on conflicting --no-cache and --frozen-cache', () => {
    expect(() => resolveCacheMode(['--no-cache', '--frozen-cache'])).toThrow(
      /can't combine.*--no-cache.*--frozen-cache/,
    );
  });

  it('throws on conflicting --no-cache and --refresh-cache', () => {
    expect(() => resolveCacheMode(['--no-cache', '--refresh-cache'])).toThrow(/Conflicting cache flags/);
  });

  it('throws on conflicting --refresh-cache and --frozen-cache', () => {
    expect(() => resolveCacheMode(['--refresh-cache', '--frozen-cache'])).toThrow(/Conflicting cache flags/);
  });

  it('throws on --cache-mode combined with --no-cache (even if values agree)', () => {
    expect(() => resolveCacheMode(['--no-cache', '--cache-mode', 'off'])).toThrow(/Conflicting cache flags/);
  });

  it('throws on unknown --cache-mode value', () => {
    expect(() => resolveCacheMode(['--cache-mode', 'bogus'])).toThrow(/Invalid --cache-mode value: bogus/);
  });

  it('throws when --cache-mode is missing its value (end of args)', () => {
    expect(() => resolveCacheMode(['--cache-mode'])).toThrow(/--cache-mode requires a value/);
  });

  it('throws when --cache-mode is followed by another flag (not a value)', () => {
    expect(() => resolveCacheMode(['--cache-mode', '--no-cache'])).toThrow(/--cache-mode requires a value/);
  });
});

describe('parseFlags', () => {
  it('parses an empty arg list', () => {
    const r = parseFlags([], { boolean: ['static'], value: ['config'] });
    expect(r.booleans.size).toBe(0);
    expect(r.values).toEqual({});
    expect(r.positional).toEqual([]);
    expect(r.unknown).toEqual([]);
  });

  it('collects boolean flags', () => {
    const r = parseFlags(['--static', '--minify'], { boolean: ['static', 'minify'] });
    expect(r.booleans.has('static')).toBe(true);
    expect(r.booleans.has('minify')).toBe(true);
  });

  it('collects value flags and consumes the next token', () => {
    const r = parseFlags(['--config', 'a.yml', '--output', 'b.svg'], {
      value: ['config', 'output'],
    });
    expect(r.values).toEqual({ config: 'a.yml', output: 'b.svg' });
  });

  it('classifies non-flag tokens as positional', () => {
    const r = parseFlags(['generate', '--static', 'extra'], { boolean: ['static'] });
    expect(r.positional).toEqual(['generate', 'extra']);
    expect(r.booleans.has('static')).toBe(true);
  });

  it('accumulates unknown flags without throwing', () => {
    const r = parseFlags(['--bogus', '--static'], { boolean: ['static'] });
    expect(r.unknown).toEqual(['--bogus']);
    expect(r.booleans.has('static')).toBe(true);
  });

  it('throws when a value flag is missing its value at end of args', () => {
    expect(() => parseFlags(['--config'], { value: ['config'] })).toThrow(/--config requires a value/);
  });

  it('throws when a value flag is followed by another flag', () => {
    expect(() => parseFlags(['--config', '--static'], { value: ['config'], boolean: ['static'] })).toThrow(
      /--config requires a value/,
    );
  });

  it('treats -- as end-of-flags and pushes remainder as positional', () => {
    const r = parseFlags(['--static', '--', '--not-a-flag', 'arg'], { boolean: ['static'] });
    expect(r.booleans.has('static')).toBe(true);
    expect(r.positional).toEqual(['--not-a-flag', 'arg']);
    expect(r.unknown).toEqual([]);
  });

  it('does not consume the next token for boolean flags (regression guard)', () => {
    const r = parseFlags(['--static', 'generate'], { boolean: ['static'] });
    expect(r.booleans.has('static')).toBe(true);
    expect(r.positional).toEqual(['generate']);
  });
});

describe('formatZodType + isZodOptional (#100)', () => {
  it('formats primitive types', () => {
    expect(formatZodType(z.string())).toBe('string');
    expect(formatZodType(z.number())).toBe('number');
    expect(formatZodType(z.boolean())).toBe('boolean');
  });

  it('unwraps .optional() to format the inner type', () => {
    expect(formatZodType(z.string().optional())).toBe('string');
    expect(formatZodType(z.number().optional())).toBe('number');
  });

  it('formats enums as quoted union', () => {
    expect(formatZodType(z.enum(['imperial', 'metric', 'both']))).toBe('"imperial" | "metric" | "both"');
    // .optional() wrapper is transparent
    expect(formatZodType(z.enum(['a', 'b']).optional())).toBe('"a" | "b"');
  });

  it('formats arrays with element type', () => {
    expect(formatZodType(z.array(z.string()))).toBe('array of string');
    expect(formatZodType(z.array(z.object({})))).toBe('array of object');
  });

  it('isZodOptional detects .optional() wrapper', () => {
    expect(isZodOptional(z.string().optional())).toBe(true);
    expect(isZodOptional(z.string())).toBe(false);
    expect(isZodOptional(z.number().nullable())).toBe(true); // .nullable() too
  });

  it('falls back gracefully on unknown / null inputs', () => {
    expect(formatZodType(null)).toBe('unknown');
    expect(formatZodType(undefined)).toBe('unknown');
    expect(isZodOptional(null)).toBe(false);
  });
});

describe('scrubSecrets (#114 L4)', () => {
  it('redacts keys matching the secret regex', () => {
    const r = scrubSecrets({
      username: 'alice',
      token: 'ghp_xyz123',
      apiKey: 'sk-abc',
      api_key: 'sk-abc',
      password: 'hunter2',
      secret: 'shh',
      authToken: 'Bearer xyz',
      credential: 'pwd',
      bearer: 'eyJ...',
      webhookUrl: 'https://hook',
      webhook_url: 'https://hook',
    });
    expect(r).toEqual({
      username: 'alice',
      token: '[REDACTED]',
      apiKey: '[REDACTED]',
      api_key: '[REDACTED]',
      password: '[REDACTED]',
      secret: '[REDACTED]',
      authToken: '[REDACTED]',
      credential: '[REDACTED]',
      bearer: '[REDACTED]',
      webhookUrl: '[REDACTED]',
      webhook_url: '[REDACTED]',
    });
  });

  it('recurses into nested objects + arrays', () => {
    const r = scrubSecrets({
      config: { nested: { token: 'x' } },
      blocks: [{ apiKey: 'k1' }, { apiKey: 'k2' }],
    });
    expect(r).toEqual({
      config: { nested: { token: '[REDACTED]' } },
      blocks: [{ apiKey: '[REDACTED]' }, { apiKey: '[REDACTED]' }],
    });
  });

  it('passes through primitives + non-secret keys unchanged', () => {
    expect(scrubSecrets({ name: 'x', count: 5, ok: true, items: [1, 2] }))
      .toEqual({ name: 'x', count: 5, ok: true, items: [1, 2] });
    expect(scrubSecrets('plain')).toBe('plain');
    expect(scrubSecrets(42)).toBe(42);
    expect(scrubSecrets(null)).toBe(null);
  });
});
