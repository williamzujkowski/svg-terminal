import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('response-size cap (#114 M4) — QA round 2 #3', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

  it('aborts via Content-Length when header exceeds 1 MiB cap', async () => {
    const warns: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: string) => { warns.push(m); });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-length': String(2 * 1024 * 1024) },
      }),
    );
    const result = await fetchJson('https://example.com/big');
    expect(result).toBeNull();
    expect(warns.some(w => w.includes('Response too large'))).toBe(true);
  });

  it('aborts mid-stream when body exceeds 1 MiB cap (no Content-Length)', async () => {
    const warns: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: string) => { warns.push(m); });
    // Construct a ReadableStream that emits >1 MiB across 2 chunks. The cap
    // (1 MiB = 1048576 bytes) should trip on the 2nd chunk and cancel.
    const chunk = new Uint8Array(700 * 1024); // 700 KiB
    chunk.fill(65); // 'A'
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk); // 1.4 MiB total → trips at chunk 2
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(stream, { status: 200 }),
    );
    const result = await fetchText('https://example.com/streamy');
    expect(result).toBeNull();
    expect(warns.some(w => w.includes('exceeded') && w.includes('cap'))).toBe(true);
  });

  it('returns body unchanged when under the cap', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('small payload', { status: 200 }),
    );
    const result = await fetchText('https://example.com/small');
    expect(result).toBe('small payload');
  });
});

describe('URL log scrubbing (#114 L3) — safeUrlForLog', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

  it('strips ?query and #fragment from logged URLs on HTTP failure', async () => {
    const warns: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: string) => { warns.push(m); });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    await fetchJson('https://api.example.com/v1/data?token=SECRET&other=foo#frag');
    const log = warns.find(w => w.includes('HTTP'));
    expect(log).toContain('https://api.example.com/v1/data');
    expect(log).not.toContain('token=SECRET');
    expect(log).not.toContain('?');
    expect(log).not.toContain('#frag');
  });

  it('strips userinfo (user:pass@host) from logged URLs', async () => {
    const warns: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: string) => { warns.push(m); });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    await fetchJson('https://user:pass@api.example.com/auth');
    const log = warns.find(w => w.includes('HTTP'));
    // Implementation falls back to protocol+host+pathname; URL parser drops userinfo.
    expect(log).not.toContain('user:pass');
    expect(log).not.toContain(':pass@');
  });
});

describe('SSRF guard (#113) — fetchWithTimeout host/scheme policy', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

  // Each blocked URL must return null WITHOUT ever calling fetch.
  const blocked = [
    ['cloud metadata IP', 'http://169.254.169.254/latest/meta-data/'],
    ['localhost name', 'http://localhost:8080/admin'],
    ['*.localhost name', 'http://api.localhost/'],
    ['loopback 127.x', 'http://127.0.0.1:5000/'],
    ['loopback 127.x (other)', 'https://127.255.255.254/'],
    ['private 10.x', 'http://10.0.0.5/'],
    ['private 172.16-31', 'http://172.20.10.1/'],
    ['private 192.168.x', 'http://192.168.1.1/'],
    ['CGNAT 100.64/10', 'http://100.64.0.1/'],
    ['"this host" 0.x', 'http://0.0.0.0/'],
    ['IPv6 loopback', 'http://[::1]:9000/'],
    ['IPv6 link-local fe80', 'http://[fe80::1]/'],
    ['IPv6 unique-local fc00', 'http://[fc00::1]/'],
    ['IPv4-mapped IPv6 metadata', 'http://[::ffff:169.254.169.254]/'],
    ['non-http scheme (file)', 'file:///etc/passwd'],
    ['non-http scheme (ftp)', 'ftp://10.0.0.1/x'],
  ] as const;

  for (const [label, url] of blocked) {
    it(`blocks ${label} and never calls fetch`, async () => {
      const spy = vi.fn();
      globalThis.fetch = spy;
      const result = await fetchWithTimeout(url);
      expect(result).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    });
  }

  // Public hosts (incl. addresses just OUTSIDE the blocked ranges) still fetch.
  const allowed = [
    'https://api.github.com/users/octocat',
    'http://172.32.0.1/',   // just past 172.16.0.0/12
    'http://192.169.0.1/',  // just past 192.168.0.0/16
    'http://8.8.8.8/',      // public DNS
  ] as const;

  for (const url of allowed) {
    it(`allows ${url}`, async () => {
      const spy = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
      globalThis.fetch = spy;
      const result = await fetchWithTimeout(url);
      expect(spy).toHaveBeenCalledOnce();
      expect(result?.ok).toBe(true);
    });
  }

  it('the refusal reason is logged with a scrubbed URL (no query string)', async () => {
    const warns: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: string) => { warns.push(m); });
    globalThis.fetch = vi.fn();
    await fetchJson('http://169.254.169.254/latest?token=SECRET');
    const log = warns.find(w => w.includes('Refused'));
    expect(log).toBeDefined();
    expect(log).not.toContain('token=SECRET');
  });
});

describe('scrubSecrets cycle guard — QA round 2 #2', () => {
  it('replaces cycles with [CIRCULAR] instead of stack-overflowing', async () => {
    const { scrubSecrets } = await import('../cli-helpers.js');
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b', parent: a };
    a['child'] = b; // cycle: a → b → a
    const result = scrubSecrets(a) as Record<string, unknown>;
    expect(result['name']).toBe('a');
    const childResult = result['child'] as Record<string, unknown>;
    expect(childResult['name']).toBe('b');
    // The b.parent reference back to a is detected as a cycle.
    expect(childResult['parent']).toBe('[CIRCULAR]');
  });

  it('replaces array cycles with [CIRCULAR]', async () => {
    const { scrubSecrets } = await import('../cli-helpers.js');
    const arr: unknown[] = [1, 2];
    arr.push(arr);
    const result = scrubSecrets(arr) as unknown[];
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe('[CIRCULAR]');
  });
});

describe('hashConfig cycle guard — QA round 2 #2', () => {
  it('throws a clean error on circular config instead of stack-overflowing', async () => {
    const { hashConfig } = await import('../cache.js');
    const a: Record<string, unknown> = { name: 'a' };
    a['self'] = a;
    expect(() => hashConfig(a)).toThrow(/circular reference/);
  });
});

describe('cycle-guard path-locality — QA round 3 MED-2', () => {
  // Round 2 used a WeakSet that never deleted, which incorrectly flagged a
  // legitimate DAG share (same sub-object reached from two paths) as a cycle.
  // Round 3 fix: Set + delete-on-exit so only ancestor cycles are caught.
  it('hashConfig handles legitimate DAG shares (no false positive)', async () => {
    const { hashConfig } = await import('../cache.js');
    const shared = { value: 42 };
    const cfg = { a: shared, b: shared }; // same sub-object, NOT a cycle
    // Should hash cleanly — no error.
    expect(() => hashConfig(cfg)).not.toThrow();
    expect(hashConfig(cfg)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('scrubSecrets handles DAG shares without [CIRCULAR] false positive', async () => {
    const { scrubSecrets } = await import('../cli-helpers.js');
    const shared = { kept: 'ok' };
    const result = scrubSecrets({ a: shared, b: shared }) as Record<string, Record<string, unknown>>;
    // Both branches recurse normally — neither is [CIRCULAR].
    expect(result['a']).toEqual({ kept: 'ok' });
    expect(result['b']).toEqual({ kept: 'ok' });
  });

  it('hashConfig still throws on a REAL cycle (regression of round-2 guard)', async () => {
    const { hashConfig } = await import('../cache.js');
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b', parent: a };
    a['child'] = b;  // ancestor cycle: a→b→a
    expect(() => hashConfig(a)).toThrow(/circular reference/);
  });
});
