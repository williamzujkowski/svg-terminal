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

describe('resolveCachePath symlink escape (#84)', () => {
  it('rejects a cachePath that escapes via a symlinked configDir', async () => {
    // outer/   ← contains the symlink + the "elsewhere" directory it points at
    // outer/elsewhere/  ← the real target
    // outer/linked/  ← symlink → outer/elsewhere/
    // outer/elsewhere/sibling.json  ← what `cachePath: '../sibling.json'` would resolve to
    //   from inside outer/linked/. Without the realpath guard, the textual
    //   check sees `../sibling.json` resolve under `outer/linked/` and pass;
    //   with the guard, realpath unwraps to `outer/elsewhere/`, and
    //   `../sibling.json` resolves to `outer/sibling.json` — outside
    //   `outer/elsewhere/`, so it must throw.
    const outer = mkdtempSync(join(tmpdir(), 'svg-terminal-symlink-'));
    const elsewhere = join(outer, 'elsewhere');
    const linked = join(outer, 'linked');
    const { mkdirSync, symlinkSync } = await import('node:fs');
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, linked, 'dir');

    const cfgInLinked = join(linked, 'terminal.yml');
    // Path that would write into outer/, escaping the realpath'd configDir (elsewhere/).
    expect(() => resolveCachePath(cfgInLinked, '../escaped.json')).toThrow(/escapes/);
    // A normal sibling stays inside the realpath'd dir.
    expect(() => resolveCachePath(cfgInLinked, 'cache.json')).not.toThrow();
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

describe('CacheRuntime invariants', () => {
  it('throws when constructed with a negative TTL', () => {
    const rt = runtime('normal', -10);
    expect(() => makeUseCache(rt)).toThrow(/≥ 0/);
  });

  it('throws when ttl is NaN', () => {
    const rt = runtime('normal', NaN);
    expect(() => makeUseCache(rt)).toThrow(/≥ 0/);
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

describe('flushCache pruning', () => {
  it('drops entries older than TTL when flushing', async () => {
    const now = Date.now();
    const ttl = 60; // 60s
    const file = {
      version: 1,
      entries: {
        fresh: { fetchedAt: new Date(now - 10_000).toISOString(), payload: { ok: true } },
        stale: { fetchedAt: new Date(now - 120_000).toISOString(), payload: { ok: false } },
        ancient: { fetchedAt: '2020-01-01T00:00:00.000Z', payload: {} },
      },
    };
    const filePath = join(dir, 'prune.json');
    writeFileSync(filePath, JSON.stringify(file));

    const rt = runtime('normal', ttl, 'prune.json');
    const useCache = makeUseCache(rt);

    // Touch the cache so it's loaded + marked dirty (write happens on flush)
    await useCache('fresh', async () => { throw new Error('should not fetch'); });
    rt.dirty = true; // force flush

    flushCache(rt);
    const after = JSON.parse(readFileSync(filePath, 'utf-8')) as { entries: Record<string, unknown> };
    expect(Object.keys(after.entries).sort()).toEqual(['fresh']);
  });

  it('does not prune when ttl is 0 (cache disabled effectively)', () => {
    const file = {
      version: 1,
      entries: { ancient: { fetchedAt: '2020-01-01T00:00:00.000Z', payload: {} } },
    };
    const filePath = join(dir, 'nottl.json');
    writeFileSync(filePath, JSON.stringify(file));

    const rt = runtime('normal', 0, 'nottl.json');
    rt.data = { version: 1, entries: { ...file.entries } };
    rt.dirty = true;
    flushCache(rt);
    const after = JSON.parse(readFileSync(filePath, 'utf-8')) as { entries: Record<string, unknown> };
    expect(Object.keys(after.entries)).toEqual(['ancient']);
  });
});

describe('checkCache', () => {
  it('reports OK for fresh entries and STALE for expired ones', async () => {
    const file = {
      version: 1,
      entries: {
        fresh: { fetchedAt: new Date().toISOString(), payload: {} },
        old: { fetchedAt: new Date(Date.now() - 7200_000).toISOString(), payload: {} },
      },
    };
    const filePath = join(dir, 'check.json');
    writeFileSync(filePath, JSON.stringify(file));

    const { checkCache } = await import('../cache.js');
    const results = checkCache({
      filePath,
      ttl: 3600,
      entries: [
        { blockName: 'a', entryIndex: 0, key: 'fresh' },
        { blockName: 'b', entryIndex: 1, key: 'old' },
        { blockName: 'c', entryIndex: 2, key: 'missing' },
      ],
    });
    expect(results.map(r => r.status)).toEqual(['OK', 'STALE', 'MISSING']);
    expect(results[0]!.ageSeconds).toBeGreaterThanOrEqual(0);
    expect(results[1]!.ageSeconds).toBeGreaterThan(3600);
  });

  it('treats a missing cache file as all entries MISSING', async () => {
    const { checkCache } = await import('../cache.js');
    const results = checkCache({
      filePath: join(dir, 'does-not-exist.json'),
      ttl: 60,
      entries: [{ blockName: 'x', entryIndex: 0, key: 'k' }],
    });
    expect(results).toEqual([{ blockName: 'x', entryIndex: 0, key: 'k', status: 'MISSING' }]);
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
