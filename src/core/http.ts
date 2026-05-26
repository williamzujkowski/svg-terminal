/**
 * HTTP fetch utilities for dynamic blocks.
 * Uses native Node 22 fetch() with timeout via AbortController.
 * All functions return null on failure — never throw.
 */

/** Default fetch timeout in milliseconds. */
export const DEFAULT_FETCH_TIMEOUT = 10000;

/**
 * Strip the query string + fragment from a URL for safe logging.
 * Today no built-in block embeds tokens in query strings, but defense in
 * depth: a future block (or third-party `registerBlock` consumer) might,
 * and unscrubbed URLs in `console.warn` end up in CI logs and shareable
 * stack traces. (#114 L3.) Falls back to the host on parse failure.
 */
function safeUrlForLog(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/**
 * Per-response byte cap to bound memory + parse time when an upstream
 * misbehaves. Largest legitimate payload we know of is ~50 KB from
 * github-stats; 1 MiB leaves several orders of magnitude of headroom
 * while preventing a hostile / compromised endpoint from OOMing CI by
 * streaming a multi-GB body inside our timeout window. (Closes M4 from
 * the v0.17.0 security review — timeout alone doesn't bound bytes once
 * headers arrive.)
 */
const MAX_RESPONSE_BYTES = 1024 * 1024;

/**
 * Read a Response body but abort when MAX_RESPONSE_BYTES is exceeded.
 * Returns the buffered text or null if the cap fires.
 */
async function readCappedText(response: Response, url: string): Promise<string | null> {
  // Fast path: respect Content-Length when present.
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
    console.warn(`[svg-terminal] Response too large (${contentLength} bytes, cap ${MAX_RESPONSE_BYTES}) from ${safeUrlForLog(url)}`);
    return null;
  }
  // Stream the body so we can short-circuit even when Content-Length is absent
  // or lies. We're past the timeout's headers-arrived window here.
  const reader = response.body?.getReader();
  if (!reader) return response.text(); // edge: no body stream (test mocks)

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        console.warn(`[svg-terminal] Response exceeded ${MAX_RESPONSE_BYTES}-byte cap mid-stream from ${safeUrlForLog(url)}`);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// Injected by tsup `define`; falls back to a dev tag under `tsx`.
declare const __PKG_VERSION__: string;
const USER_AGENT = `svg-terminal/${typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '0.0.0-dev'}`;

/**
 * Fetch a URL with a timeout. Returns the Response or null on failure.
 * Never throws — all errors are caught and logged.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      console.warn(`[svg-terminal] HTTP ${response.status} from ${safeUrlForLog(url)}`);
      return null;
    }
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('abort')) {
      console.warn(`[svg-terminal] Timeout after ${timeoutMs}ms fetching ${safeUrlForLog(url)}`);
    } else {
      console.warn(`[svg-terminal] Fetch failed for ${safeUrlForLog(url)}: ${message}`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch JSON from a URL with a timeout. Returns parsed data or null.
 * Never throws — all errors are caught and logged.
 */
export async function fetchJson<T = unknown>(
  url: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT,
): Promise<T | null> {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response) return null;

  const text = await readCappedText(response, url);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn(`[svg-terminal] Invalid JSON from ${safeUrlForLog(url)}`);
    return null;
  }
}

/**
 * Fetch plain text from a URL with a timeout. Returns text or null.
 * Never throws — all errors are caught and logged.
 */
export async function fetchText(
  url: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT,
): Promise<string | null> {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response) return null;

  try {
    return await readCappedText(response, url);
  } catch {
    console.warn(`[svg-terminal] Failed to read text from ${safeUrlForLog(url)}`);
    return null;
  }
}
