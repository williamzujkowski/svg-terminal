import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BlockContext, TerminalConfig } from '../../types.js';
import { DEFAULT_CONFIG } from '../../core/defaults.js';
import { weatherBlock } from '../weather.js';
import { githubStatsBlock } from '../github-stats.js';
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
