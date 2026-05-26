import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BlockContext, TerminalConfig } from '../../types.js';
import { DEFAULT_CONFIG } from '../../core/defaults.js';
import { weatherBlock } from '../weather.js';
import { githubStatsBlock } from '../github-stats.js';
import { githubLanguagesBlock } from '../github-languages.js';
import { quoteBlock } from '../quote.js';
import { funFactBlock } from '../fun-fact.js';
import { motdBlock } from '../motd.js';

const testConfig: TerminalConfig = { ...DEFAULT_CONFIG, fetchTimeout: 5000 };

function makeContext(): BlockContext {
  return {
    now: new Date('2026-02-19T12:00:00Z'),
    config: testConfig,
    variables: {},
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('weather block', () => {
  it('shows warning when no location configured', async () => {
    const result = await weatherBlock.render(makeContext(), {});
    expect(result.lines.join('\n')).toContain('no location configured');
  });

  it('renders weather data on successful fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        current_condition: [{
          temp_F: '45', temp_C: '7', FeelsLikeF: '40', FeelsLikeC: '4',
          humidity: '65', weatherDesc: [{ value: 'Partly Cloudy' }],
          windspeedMiles: '12', windspeedKmph: '19', winddir16Point: 'NW',
          uvIndex: '2',
        }],
        nearest_area: [{
          areaName: [{ value: 'New York' }],
          region: [{ value: 'New York' }],
          country: [{ value: 'United States' }],
        }],
      }), { status: 200 }),
    );

    const result = await weatherBlock.render(makeContext(), { location: 'NYC' });
    const text = result.lines.join('\n');
    expect(text).toContain('New York');
    expect(text).toContain('Partly Cloudy');
    expect(result.command).toContain('wttr.in/NYC');
  });

  it('shows fallback on API failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    const result = await weatherBlock.render(makeContext(), { location: 'NYC' });
    expect(result.lines.join('\n')).toContain('unavailable');
  });
});

describe('github-stats block', () => {
  it('shows warning when no username configured', async () => {
    const result = await githubStatsBlock.render(makeContext(), {});
    expect(result.lines.join('\n')).toContain('no username configured');
  });

  it('renders stats on successful fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        public_repos: 42,
        followers: 1234,
        following: 10,
        public_gists: 5,
        created_at: '2015-06-15T00:00:00Z',
        bio: 'Developer',
      }), { status: 200 }),
    );

    const result = await githubStatsBlock.render(makeContext(), { username: 'testuser' });
    const text = result.lines.join('\n');
    expect(text).toContain('@testuser');
    expect(text).toContain('42');
    expect(text).toContain('1.2k');
    expect(text).toContain('2015');
  });

  it('shows fallback on API failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('rate limit'));

    const result = await githubStatsBlock.render(makeContext(), { username: 'testuser' });
    expect(result.lines.join('\n')).toContain('unavailable');
  });
});

describe('github-languages block', () => {
  it('aggregates languages from fetched repos and emits percentage bars', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        { language: 'TypeScript' },
        { language: 'TypeScript' },
        { language: 'TypeScript' },
        { language: 'Python' },
        { language: 'Python' },
        { language: 'Rust' },
        { language: null },
      ]), { status: 200 }),
    );

    const result = await githubLanguagesBlock.render(makeContext(), { username: 'testuser' });
    const text = result.lines.join('\n');
    // 3 TS / 6 total = 50%, 2 Py / 6 = 33%, 1 Rust / 6 = 17%
    expect(text).toContain('TypeScript');
    expect(text).toContain('Python');
    expect(text).toContain('Rust');
    expect(text).toContain('50%');
    // null language should have been skipped — only 3 distinct languages in output
    expect(result.lines.length).toBe(3);
  });

  it('falls back to static defaults on API failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('rate limit'));

    const result = await githubLanguagesBlock.render(makeContext(), { username: 'testuser' });
    const text = result.lines.join('\n');
    expect(text).toContain('TypeScript');
    expect(text).toContain('65%');
  });

  it('falls back to user-provided fallback on API failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('rate limit'));

    const result = await githubLanguagesBlock.render(makeContext(), {
      username: 'testuser',
      fallback: [{ name: 'Haskell', percent: 100 }],
    });
    expect(result.lines.join('\n')).toContain('Haskell');
  });
});

describe('quote block', () => {
  it('renders fetched quote on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 1,
        quote: 'Test quote content here.',
        author: 'Test Author',
      }), { status: 200 }),
    );

    const result = await quoteBlock.render(makeContext(), {});
    const text = result.lines.join('\n');
    expect(text).toContain('Test quote content here.');
    expect(text).toContain('Test Author');
  });

  it('uses fallback on API failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    const result = await quoteBlock.render(makeContext(), {
      fallback: 'Fallback wisdom',
      fallbackAuthor: 'Fallback Person',
    });
    const text = result.lines.join('\n');
    expect(text).toContain('Fallback wisdom');
    expect(text).toContain('Fallback Person');
  });
});

describe('fun-fact block', () => {
  it('renders fetched fact on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: '1',
        text: 'Cats have five toes on their front paws.',
        source: 'test',
        source_url: 'https://test.com',
        language: 'en',
      }), { status: 200 }),
    );

    const result = await funFactBlock.render(makeContext(), {});
    const text = result.lines.join('\n');
    expect(text).toContain('DID YOU KNOW');
    expect(text).toContain('Cats have five toes');
  });

  it('uses fallback on API failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    const result = await funFactBlock.render(makeContext(), {});
    const text = result.lines.join('\n');
    expect(text).toContain('DID YOU KNOW');
    expect(text).toContain('Honey never spoils');
  });
});

describe('motd block with weather', () => {
  it('renders basic MOTD without weather', async () => {
    const result = await motdBlock.render(makeContext(), { title: 'TEST' });
    const text = result.lines.join('\n');
    expect(text).toContain('TEST');
    expect(text).toContain('v2026.02');
  });

  it('includes weather line when weather config provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        current_condition: [{
          temp_F: '72', temp_C: '22', FeelsLikeF: '70', FeelsLikeC: '21',
          humidity: '50', weatherDesc: [{ value: 'Sunny' }],
          windspeedMiles: '5', windspeedKmph: '8', winddir16Point: 'S',
          uvIndex: '6',
        }],
        nearest_area: [{
          areaName: [{ value: 'LA' }],
          region: [{ value: 'California' }],
          country: [{ value: 'US' }],
        }],
      }), { status: 200 }),
    );

    const result = await motdBlock.render(makeContext(), {
      title: 'TEST',
      weather: { location: 'LA', units: 'imperial' },
    });
    const text = result.lines.join('\n');
    expect(text).toContain('Sunny');
    expect(text).toContain('72°F');
  });

  it('renders MOTD without weather line on API failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    const result = await motdBlock.render(makeContext(), {
      title: 'TEST',
      weather: { location: 'NYC' },
    });
    const text = result.lines.join('\n');
    expect(text).toContain('TEST');
    // Should NOT contain weather error — just silently omits it
    expect(text).not.toContain('unavailable');
  });
});

describe('fetch timeout fallback', () => {
  it('falls back to static defaults when the upstream API hangs past fetchTimeout', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // fetch that respects AbortSignal but otherwise never resolves
    globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
      const signal = (opts as { signal?: AbortSignal } | undefined)?.signal;
      return new Promise((_resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });

    const ctx: BlockContext = {
      now: new Date('2026-02-19T12:00:00Z'),
      config: { ...DEFAULT_CONFIG, fetchTimeout: 50 },
      variables: {},
    };

    const result = await quoteBlock.render(ctx, {});
    // Block should not hang — it bails to the fallback content within ~50ms.
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('URL query strings scrubbed from http.ts warn logs (#114 L3)', () => {
  // Defense-in-depth: today no built-in block sends tokens in query strings,
  // but a future third-party block via registerBlock might, and unscrubbed
  // URLs in CI logs are a known leak path. fetchJson logs the URL on HTTP
  // failure; verify the query portion is stripped.
  it('strips ?query from logged URLs on HTTP failure', async () => {
    const warns: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation(msg => { warns.push(String(msg)); });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    const { fetchJson } = await import('../../core/http.js');
    await fetchJson('https://api.example.com/v1/data?token=SECRET&other=foo');
    const log = warns.find(w => w.includes('HTTP'));
    expect(log).toBeTruthy();
    expect(log).not.toContain('token=SECRET');
    expect(log).not.toContain('?');
    expect(log).toContain('https://api.example.com/v1/data');
  });
});

describe('cacheable blocks set result.fallback when serving defaults (#102)', () => {
  // Each cacheable block returns fallback content when the fetch fails or
  // required config is missing. They must set result.fallback = true so
  // generate() can fire the 'fallback' onCacheEvent and the CLI can warn
  // the user that they're seeing defaults, not live data.
  const ctx: BlockContext = {
    now: new Date('2026-02-19T12:00:00Z'),
    config: { ...DEFAULT_CONFIG, fetchTimeout: 50 },
    variables: {},
  };

  afterEach(() => vi.restoreAllMocks());

  it('weather: fallback=true when location is missing', async () => {
    const result = await weatherBlock.render(ctx, {});
    expect(result.fallback).toBe(true);
  });

  it('github-languages: fallback=true when username is missing', async () => {
    const result = await githubLanguagesBlock.render(ctx, {});
    expect(result.fallback).toBe(true);
  });

  it('quote: fallback=true when fetch returns null', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const result = await quoteBlock.render(ctx, {});
    expect(result.fallback).toBe(true);
  });

  it('quote: offline fallback rotates through fortune pool (#104)', async () => {
    // Different days → different fortune indices → different rendered text.
    // Previously the offline fallback was a single hardcoded Steve Jobs string.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const day1 = await quoteBlock.render({ ...ctx, now: new Date('2026-01-01') }, {});
    const day2 = await quoteBlock.render({ ...ctx, now: new Date('2026-01-15') }, {});
    expect(day1.lines.join('\n')).not.toEqual(day2.lines.join('\n'));
  });

  it('quote: user-provided fallback overrides the fortune pool', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const result = await quoteBlock.render(ctx, { fallback: 'CUSTOM USER QUOTE', fallbackAuthor: 'Me' });
    expect(result.lines.join('\n')).toContain('CUSTOM USER QUOTE');
    expect(result.lines.join('\n')).toContain('— Me');
  });

  it('fun-fact: fallback=true when fetch returns null', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const result = await funFactBlock.render(ctx, {});
    expect(result.fallback).toBe(true);
  });

  it('github-stats: fallback=true when fetch returns null', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    const result = await githubStatsBlock.render(ctx, { username: 'ghost-user' });
    expect(result.fallback).toBe(true);
  });
});
