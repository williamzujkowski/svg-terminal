/**
 * XML utility functions for SVG generation.
 */

/** Escape special XML characters to prevent SVG parsing errors. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Round a coordinate to reduce floating-point artifacts in SVG output. */
export function roundCoord(value: number, decimals = 0): number {
  if (decimals === 0) return Math.round(value);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Round an animation timing value (ms) for SVG output.
 * 1 decimal is sub-frame-perception precision — saves ~15 bytes per
 * `begin="..."` attribute vs. full IEEE 754 floats like `2809.090909090909`.
 */
export function roundTime(ms: number): number {
  return Math.round(ms * 10) / 10;
}

/** Calculate approximate text width for monospace font. */
export function getTextWidth(text: string, fontSize: number): number {
  return roundCoord(text.length * (fontSize * 0.6));
}
