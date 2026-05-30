/**
 * HTTP fetch utilities for dynamic blocks.
 * Uses native Node 22 fetch() with timeout via AbortController.
 * All functions return null on failure — never throw.
 */

import { isIP } from 'node:net';

/** Default fetch timeout in milliseconds. */
export const DEFAULT_FETCH_TIMEOUT = 10000;

/**
 * SSRF guard (#113, M3 from the v0.17.0 audit). No built-in block takes an
 * arbitrary URL — every cacheable block hardcodes its upstream host — but
 * `fetchWithTimeout` is public API, so a third-party `registerBlock` consumer
 * could pass one. Block literal private / loopback / link-local addresses and
 * non-http(s) schemes before issuing the request, so a naive or hostile block
 * can't reach `http://169.254.169.254/` (cloud metadata) or `http://localhost:N/`
 * on a CI runner.
 *
 * Scope + honesty: this is belt-and-braces, NOT a hard boundary — a block's
 * `render()` runs arbitrary code and could open its own socket. It is a
 * SYNCHRONOUS check on the URL's literal host: it does not resolve DNS, so a
 * public hostname with a private A-record (or DNS-rebinding) is out of scope.
 * Full coverage would need DNS resolution + a connection-pinned dispatcher;
 * tracked as future hardening. The common abuse vectors (literal metadata IP,
 * localhost) are covered.
 */
function ipv4Blocked(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true;                          // 0.0.0.0/8 "this host"
  if (a === 10) return true;                         // 10.0.0.0/8 private
  if (a === 127) return true;                        // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;           // 169.254.0.0/16 link-local (incl. metadata)
  if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true;           // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

function ipv6Blocked(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::') return true;        // loopback / unspecified
  if (/^fe[89ab]/.test(v)) return true;              // fe80::/10 link-local
  if (/^f[cd]/.test(v)) return true;                 // fc00::/7 unique-local (private)
  // IPv4-mapped, dotted form (::ffff:a.b.c.d) — validate the embedded v4.
  const dotted = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return ipv4Blocked(dotted[1]!);
  // IPv4-mapped, hex form (::ffff:hhhh:hhhh) — the URL parser normalizes the
  // dotted form to this, so decode the trailing 32 bits back to a.b.c.d.
  const hex = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1]!, 16);
    const lo = parseInt(hex[2]!, 16);
    return ipv4Blocked(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`);
  }
  return false;
}

/** True if the URL's literal host is a private/loopback/link-local address or
 *  a loopback hostname. See the SSRF guard doc above for the surrounding policy. */
function isBlockedHost(hostname: string): boolean {
  // URL.hostname keeps brackets on IPv6 literals; strip them.
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  const kind = isIP(host);
  if (kind === 4) return ipv4Blocked(host);
  if (kind === 6) return ipv6Blocked(host);
  return false; // non-IP hostname — not resolved here (see guard doc above)
}

/**
 * Validate a URL against the SSRF policy. Returns a scrubbed reason string when
 * the request must be refused, or null when it's allowed.
 */
function fetchBlockReason(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'unparseable URL';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `unsupported scheme "${parsed.protocol}"`;
  }
  if (isBlockedHost(parsed.hostname)) {
    return 'private / loopback / link-local address';
  }
  return null;
}

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
  // SSRF guard (#113) — refuse private/loopback/link-local hosts + non-http(s)
  // schemes before any network I/O. See fetchBlockReason / the guard doc above.
  const blocked = fetchBlockReason(url);
  if (blocked) {
    console.warn(`[svg-terminal] Refused to fetch ${safeUrlForLog(url)}: ${blocked}`);
    return null;
  }

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
