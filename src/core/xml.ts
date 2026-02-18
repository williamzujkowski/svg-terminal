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

/** Round a coordinate to reduce floating-point artifacts in SVG. */
export function roundCoord(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Calculate approximate text width for monospace font. */
export function getTextWidth(text: string, fontSize: number): number {
  return roundCoord(text.length * (fontSize * 0.6));
}
