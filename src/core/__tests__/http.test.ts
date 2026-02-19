import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout, fetchJson, fetchText } from '../http.js';

describe('fetchWithTimeout', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns response on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('ok', { status: 200 }),
    );
    const result = await fetchWithTimeout('https://example.com');
    expect(result).not.toBeNull();
    expect(result?.ok).toBe(true);
  });

  it('returns null on HTTP error status', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('not found', { status: 404 }),
    );
    const result = await fetchWithTimeout('https://example.com/404');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await fetchWithTimeout('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null on timeout', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'));
          });
        }),
    );
    const result = await fetchWithTimeout('https://example.com', 50);
    expect(result).toBeNull();
  });
});

describe('fetchJson', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: 'value' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await fetchJson<{ key: string }>('https://example.com/api');
    expect(result).toEqual({ key: 'value' });
  });

  it('returns null on invalid JSON', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('not json', { status: 200 }),
    );
    const result = await fetchJson('https://example.com/bad');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await fetchJson('https://example.com');
    expect(result).toBeNull();
  });
});

describe('fetchText', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns text on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('hello world', { status: 200 }),
    );
    const result = await fetchText('https://example.com');
    expect(result).toBe('hello world');
  });

  it('returns null on failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await fetchText('https://example.com');
    expect(result).toBeNull();
  });
});
