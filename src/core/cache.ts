/**
 * Dynamic-block fetch cache. Plain JSON, human-readable, diff-friendly —
 * users are expected to commit the cache file alongside their config so CI
 * builds become reproducible (and offline-friendly when paired with a
 * generous cacheTTL or `--frozen-cache`).
 *
 * File format:
 *   {
 *     "version": 1,
 *     "entries": {
 *       "blockName:configHash": {
 *         "fetchedAt": "2026-05-24T06:00:00.000Z",
 *         "payload": <JSON-serializable value>
 *       }
 *     }
 *   }
 *
 * Concurrency: writes go through a temp file + atomic rename in the target
 * directory (same pattern as the SVG output write).
 */

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

/** Current on-disk schema version. Bump when the entry shape changes. */
export const CACHE_VERSION = 1;

interface CacheEntry {
  fetchedAt: string;
  payload: unknown;
}

interface CacheFile {
  version: number;
  entries: Record<string, CacheEntry>;
}

/** Runtime cache mode driven by CLI flags. */
export type CacheMode = 'normal' | 'refresh' | 'frozen' | 'off';

export interface CacheRuntime {
  mode: CacheMode;
  /** Absolute path to the cache file. */
  filePath: string;
  /** TTL in seconds. */
  ttl: number;
  /** In-memory copy of the on-disk file; lazily loaded. */
  data?: CacheFile;
  /** Becomes true once any entry has been added/updated this run. */
  dirty: boolean;
}

/** Deterministic, length-bounded hash of a config bag. */
export function hashConfig(config: unknown): string {
  const json = canonicalize(config);
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

/** Stable JSON: sort object keys recursively so identical configs hash identically. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

/**
 * Resolve a user-supplied cachePath against the config-file directory,
 * with a path-traversal guard. Throws if the resolved path escapes the
 * config directory tree (defense against `cachePath: ../../etc/passwd`).
 */
export function resolveCachePath(configPath: string, cachePath: string): string {
  const configDir = dirname(resolve(configPath));
  // Explicit absolute paths: trust the user. They typed it with intent.
  if (isAbsolute(cachePath)) return resolve(cachePath);
  // Relative paths: resolve against configDir, then require the result stays
  // inside that directory tree. Blocks `../../etc/passwd` style traversal.
  const resolved = resolve(configDir, cachePath);
  if (resolved !== configDir && !resolved.startsWith(configDir + sep)) {
    throw new Error(`cachePath "${cachePath}" escapes the config directory`);
  }
  return resolved;
}

/** Load and parse the cache file. Returns empty defaults if missing or corrupt. */
function loadCacheFile(filePath: string): CacheFile {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    return { version: CACHE_VERSION, entries: {} };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CacheFile>;
    if (parsed.version !== CACHE_VERSION || typeof parsed.entries !== 'object' || parsed.entries === null) {
      console.warn(`[svg-terminal] cache: ignoring file at ${filePath} (incompatible schema)`);
      return { version: CACHE_VERSION, entries: {} };
    }
    return parsed as CacheFile;
  } catch {
    console.warn(`[svg-terminal] cache: ignoring corrupt JSON at ${filePath}`);
    return { version: CACHE_VERSION, entries: {} };
  }
}

/** Atomic write via temp file + rename. */
function persistCacheFile(filePath: string, data: CacheFile): void {
  const dir = dirname(filePath);
  const tmp = join(dir, `.svg-terminal-cache.${randomBytes(6).toString('hex')}.tmp`);
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  try {
    renameSync(tmp, filePath);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    throw err;
  }
}

/**
 * Return a useCache function bound to the given runtime.
 * Wire this into BlockContext.useCache.
 */
export function makeUseCache(runtime: CacheRuntime): NonNullable<import('../types.js').BlockContext['useCache']> {
  return async <T>(key: string, getter: () => Promise<T>, opts?: { ttl?: number }): Promise<T> => {
    if (runtime.mode === 'off') {
      return getter();
    }
    if (!runtime.data) runtime.data = loadCacheFile(runtime.filePath);

    const ttl = Math.max(0, opts?.ttl ?? runtime.ttl);
    const now = Date.now();
    const entry = runtime.data.entries[key];

    if (runtime.mode === 'frozen') {
      // Frozen mode: serve the cached entry no matter how old; if it's
      // missing, surface that as an error rather than fetching.
      if (entry) return entry.payload as T;
      throw new Error(`cache: frozen mode but no entry for "${key}" — re-run without --frozen-cache to populate`);
    }

    if (runtime.mode === 'normal' && entry) {
      const ageMs = now - Date.parse(entry.fetchedAt);
      if (ageMs >= 0 && ageMs < ttl * 1000) {
        return entry.payload as T;
      }
    }

    // refresh OR (normal AND stale/missing): fetch fresh and write back.
    const payload = await getter();
    runtime.data.entries[key] = {
      fetchedAt: new Date(now).toISOString(),
      payload,
    };
    runtime.dirty = true;
    return payload;
  };
}

/** Flush the in-memory cache to disk if anything changed. */
export function flushCache(runtime: CacheRuntime): void {
  if (runtime.mode === 'off' || runtime.mode === 'frozen' || !runtime.dirty || !runtime.data) return;
  pruneStaleEntries(runtime.data, runtime.ttl);
  persistCacheFile(runtime.filePath, runtime.data);
}

/**
 * Drop entries whose `fetchedAt` is older than `ttl` seconds. Keeps the cache
 * file bounded over long-lived projects with shifting block configs (rotating
 * quote sources, evolving entry shapes that change the configHash).
 */
function pruneStaleEntries(data: CacheFile, ttl: number): void {
  if (ttl <= 0) return;
  const cutoffMs = Date.now() - ttl * 1000;
  for (const [key, entry] of Object.entries(data.entries)) {
    if (Date.parse(entry.fetchedAt) < cutoffMs) {
      delete data.entries[key];
    }
  }
}

/** Per-entry status returned by checkCache(). */
export interface CacheCheckResult {
  key: string;
  blockName: string;
  entryIndex: number;
  /** OK = present + within TTL; STALE = present + expired; MISSING = no entry. */
  status: 'OK' | 'STALE' | 'MISSING';
  /** Age in seconds, present when status is OK or STALE. */
  ageSeconds?: number;
}

export interface CacheCheckInput {
  /** Cache file to inspect (already path-resolved). */
  filePath: string;
  /** TTL in seconds against which OK/STALE is judged. */
  ttl: number;
  /** Entries to verify — one per cacheable block in the config. */
  entries: Array<{ blockName: string; entryIndex: number; key: string }>;
}

/** Walk a cache file and verify each expected entry's freshness. */
export function checkCache(input: CacheCheckInput): CacheCheckResult[] {
  // loadCacheFile is module-private; inline the read here for the public surface.
  let data: CacheFile;
  try {
    data = JSON.parse(readFileSync(input.filePath, 'utf-8')) as CacheFile;
    if (data.version !== CACHE_VERSION || typeof data.entries !== 'object' || data.entries === null) {
      data = { version: CACHE_VERSION, entries: {} };
    }
  } catch {
    data = { version: CACHE_VERSION, entries: {} };
  }

  const now = Date.now();
  return input.entries.map(({ blockName, entryIndex, key }) => {
    const entry = data.entries[key];
    if (!entry) return { key, blockName, entryIndex, status: 'MISSING' };
    const ageMs = now - Date.parse(entry.fetchedAt);
    const ageSeconds = Math.max(0, Math.round(ageMs / 1000));
    if (ageMs >= 0 && ageMs < input.ttl * 1000) {
      return { key, blockName, entryIndex, status: 'OK', ageSeconds };
    }
    return { key, blockName, entryIndex, status: 'STALE', ageSeconds };
  });
}
