import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import {
  CACHE_VERSION,
  flushCache,
  hashConfig,
  makeUseCache,
  resolveCachePath,
  type CacheRuntime,
} from '../cache.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'svg-terminal-cache-'));
});

function runtime(mode: CacheRuntime['mode'], ttl = 60, fileName = 'cache.json'): CacheRuntime {
  return { mode, filePath: join(dir, fileName), ttl, dirty: false };
}

describe('hashConfig', () => {
  it('produces stable hashes regardless of key order', () => {
    expect(hashConfig({ a: 1, b: 2 })).toBe(hashConfig({ b: 2, a: 1 }));
  });

  it('separates different configs', () => {
    expect(hashConfig({ a: 1 })).not.toBe(hashConfig({ a: 2 }));
  });

  it('returns a 16-char hex slice', () => {
    expect(hashConfig({})).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('resolveCachePath', () => {
  it('resolves a relative cachePath against the config directory', () => {
    const cfg = join(dir, 'terminal.yml');
    expect(resolveCachePath(cfg, '.svg-terminal-cache.json'))
      .toBe(join(dir, '.svg-terminal-cache.json'));
  });

  it('rejects traversal escaping the config directory', () => {
    const cfg = join(dir, 'terminal.yml');
    expect(() => resolveCachePath(cfg, `..${sep}escape.json`)).toThrow(/escapes/);
  });

  it('honors an explicit absolute path', () => {
    const cfg = join(dir, 'terminal.yml');
    const abs = join(dir, 'subdir', 'cache.json');
    expect(resolveCachePath(cfg, abs)).toBe(abs);
  });
});

describe('useCache modes', () => {
  it('normal mode: fetches on miss and persists on flush', async () => {
    const rt = runtime('normal');
    const useCache = makeUseCache(rt);
    let calls = 0;

    const v1 = await useCache('k', async () => { calls++; return { n: 1 }; });
    expect(v1).toEqual({ n: 1 });
    expect(calls).toBe(1);

    // Second call: served from in-memory cache, no extra fetch
    const v2 = await useCache('k', async () => { calls++; return { n: 2 }; });
    expect(v2).toEqual({ n: 1 });
    expect(calls).toBe(1);

    flushCache(rt);
    expect(existsSync(rt.filePath)).toBe(true);
    const onDisk = JSON.parse(readFileSync(rt.filePath, 'utf-8')) as { version: number; entries: Record<string, unknown> };
    expect(onDisk.version).toBe(CACHE_VERSION);
    expect(onDisk.entries.k).toBeDefined();
  });

  it('normal mode: serves a fresh cache entry without invoking the getter', async () => {
    const fileContent = {
      version: CACHE_VERSION,
      entries: {
        k: { fetchedAt: new Date().toISOString(), payload: { cached: true } },
      },
    };
    const rt = runtime('normal');
    writeFileSync(rt.filePath, JSON.stringify(fileContent));

    const useCache = makeUseCache(rt);
    const v = await useCache('k', async () => { throw new Error('should not fetch'); });
    expect(v).toEqual({ cached: true });
  });

  it('normal mode: refetches an expired entry', async () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const fileContent = {
      version: CACHE_VERSION,
      entries: { k: { fetchedAt: tenMinAgo, payload: { old: true } } },
    };
    const rt = runtime('normal', 60); // 60s TTL
    writeFileSync(rt.filePath, JSON.stringify(fileContent));

    const useCache = makeUseCache(rt);
    const v = await useCache('k', async () => ({ fresh: true }));
    expect(v).toEqual({ fresh: true });
  });

  it('refresh mode: ignores existing entries and refetches', async () => {
    const fileContent = {
      version: CACHE_VERSION,
      entries: { k: { fetchedAt: new Date().toISOString(), payload: { stale: true } } },
    };
    const rt = runtime('refresh');
    writeFileSync(rt.filePath, JSON.stringify(fileContent));

    const useCache = makeUseCache(rt);
    const v = await useCache('k', async () => ({ refreshed: true }));
    expect(v).toEqual({ refreshed: true });
    flushCache(rt);
    const onDisk = JSON.parse(readFileSync(rt.filePath, 'utf-8')) as { entries: Record<string, { payload: unknown }> };
    expect(onDisk.entries.k!.payload).toEqual({ refreshed: true });
  });

  it('frozen mode: serves any cached entry regardless of age', async () => {
    const ancient = new Date('2020-01-01').toISOString();
    const fileContent = {
      version: CACHE_VERSION,
      entries: { k: { fetchedAt: ancient, payload: { ancient: true } } },
    };
    const rt = runtime('frozen', 60);
    writeFileSync(rt.filePath, JSON.stringify(fileContent));

    const useCache = makeUseCache(rt);
    const v = await useCache('k', async () => { throw new Error('frozen should not fetch'); });
    expect(v).toEqual({ ancient: true });
  });

  it('frozen mode: throws on cache miss instead of fetching', async () => {
    const rt = runtime('frozen');
    const useCache = makeUseCache(rt);
    await expect(useCache('missing', async () => ({ fetched: true }))).rejects.toThrow(/frozen mode/);
  });

  it('off mode: bypasses the cache entirely and never writes a file', async () => {
    const rt = runtime('off');
    rt.filePath = ''; // off mode shouldn't touch a path
    const useCache = makeUseCache(rt);
    const v = await useCache('k', async () => ({ direct: true }));
    expect(v).toEqual({ direct: true });
    flushCache(rt);
    // nothing written
  });

  it('respects a per-call TTL override', async () => {
    const fileContent = {
      version: CACHE_VERSION,
      entries: { k: { fetchedAt: new Date(Date.now() - 30_000).toISOString(), payload: { v: 1 } } },
    };
    const rt = runtime('normal', 60); // global TTL 60s — entry is still fresh
    writeFileSync(rt.filePath, JSON.stringify(fileContent));

    const useCache = makeUseCache(rt);
    // Per-call ttl of 1s: 30s-old entry is expired → fetch
    const v = await useCache('k', async () => ({ v: 2 }), { ttl: 1 });
    expect(v).toEqual({ v: 2 });
  });
});

describe('corrupt cache file handling', () => {
  it('ignores corrupt JSON and starts fresh', async () => {
    const rt = runtime('normal');
    writeFileSync(rt.filePath, '{not json');
    const useCache = makeUseCache(rt);
    const v = await useCache('k', async () => ({ ok: true }));
    expect(v).toEqual({ ok: true });
  });

  it('ignores cache files with wrong schema version', async () => {
    const rt = runtime('normal');
    writeFileSync(rt.filePath, JSON.stringify({ version: 999, entries: {} }));
    const useCache = makeUseCache(rt);
    const v = await useCache('k', async () => ({ ok: true }));
    expect(v).toEqual({ ok: true });
  });
});
