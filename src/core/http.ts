/**
 * HTTP fetch utilities for dynamic blocks.
 * Uses native Node 22 fetch() with timeout via AbortController.
 * All functions return null on failure — never throw.
 */

/** Default fetch timeout in milliseconds. */
export const DEFAULT_FETCH_TIMEOUT = 10000;

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
      headers: { 'User-Agent': 'svg-terminal/0.5.0' },
    });
    if (!response.ok) {
      console.warn(`[svg-terminal] HTTP ${response.status} from ${url}`);
      return null;
    }
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('abort')) {
      console.warn(`[svg-terminal] Timeout after ${timeoutMs}ms fetching ${url}`);
    } else {
      console.warn(`[svg-terminal] Fetch failed for ${url}: ${message}`);
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

  try {
    return (await response.json()) as T;
  } catch {
    console.warn(`[svg-terminal] Invalid JSON from ${url}`);
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
    return await response.text();
  } catch {
    console.warn(`[svg-terminal] Failed to read text from ${url}`);
    return null;
  }
}
