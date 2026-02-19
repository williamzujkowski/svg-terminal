/**
 * Markup parser for [[style]] formatted text.
 * Converts template output to styled spans for SVG rendering.
 *
 * Supported tags:
 * - [[fg:colorName]]text[[/fg]] — foreground color
 * - [[bg:colorName]]text[[/bg]] — background color
 * - [[bold]]text[[/bold]] — bold weight
 * - [[dim]]text[[/dim]] — dimmed opacity
 */

import type { StyledSpan, ThemeColors } from '../types.js';

/** Build a color lookup map from theme colors. */
export function buildColorMap(colors: ThemeColors): Record<string, string> {
  return {
    // Standard terminal colors — black uses theme background
    black: colors.background,
    red: colors.red,
    green: colors.green,
    yellow: colors.yellow,
    blue: colors.blue,
    magenta: colors.magenta,
    cyan: colors.cyan,
    white: colors.white,
    // Bright variants
    bright_black: colors.brightBlack,
    bright_red: colors.brightRed,
    bright_green: colors.brightGreen,
    bright_yellow: colors.brightYellow,
    bright_blue: colors.brightBlue,
    bright_magenta: colors.brightMagenta,
    bright_cyan: colors.brightCyan,
    bright_white: colors.brightWhite,
    // Extended
    purple: colors.purple,
    pink: colors.pink,
    orange: colors.orange,
    comment: colors.comment,
    neon_green: colors.prompt,
    matrix_green: colors.cursor,
  };
}

/** Valid hex color pattern: #RGB or #RRGGBB. */
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Resolve a color name to hex using the color map. */
export function resolveColor(
  colorName: string,
  colorMap: Record<string, string>,
  fallback: string,
): string {
  if (colorName.startsWith('#')) {
    return HEX_COLOR_RE.test(colorName) ? colorName : fallback;
  }
  return colorMap[colorName.toLowerCase()] ?? fallback;
}

/** Parse [[style]] markup into styled spans. */
export function parseMarkup(
  text: string,
  colorMap: Record<string, string>,
  fallbackColor: string,
): StyledSpan[] {
  if (!text) {
    return [{ text: '', fg: null, bg: null, bold: false, dim: false }];
  }

  if (!text.includes('[[')) {
    return [{ text, fg: null, bg: null, bold: false, dim: false }];
  }

  const spans: StyledSpan[] = [];
  let pos = 0;
  let currentStyle = { fg: null as string | null, bg: null as string | null, bold: false, dim: false };
  const styleStack: typeof currentStyle[] = [];

  while (pos < text.length) {
    const openStart = text.indexOf('[[', pos);

    if (openStart === -1) {
      const remaining = text.slice(pos);
      if (remaining) spans.push({ text: remaining, ...currentStyle });
      break;
    }

    if (openStart > pos) {
      spans.push({ text: text.slice(pos, openStart), ...currentStyle });
    }

    const openEnd = text.indexOf(']]', openStart);
    if (openEnd === -1) {
      // Unclosed tag — treat rest as plain text
      spans.push({ text: text.slice(openStart), ...currentStyle });
      break;
    }

    const tag = text.slice(openStart + 2, openEnd);
    pos = openEnd + 2;

    if (tag.startsWith('/')) {
      // Closing tag — pop style stack
      if (styleStack.length > 0) {
        currentStyle = { ...styleStack.pop()! };
      }
    } else {
      // Opening tag — push current style and apply new
      styleStack.push({ ...currentStyle });

      if (tag === 'bold') {
        currentStyle.bold = true;
      } else if (tag === 'dim') {
        currentStyle.dim = true;
      } else if (tag.startsWith('fg:')) {
        currentStyle.fg = resolveColor(tag.slice(3), colorMap, fallbackColor);
      } else if (tag.startsWith('bg:')) {
        currentStyle.bg = resolveColor(tag.slice(3), colorMap, fallbackColor);
      }
    }
  }

  return mergeSpans(spans);
}

/** Merge adjacent spans with identical styles. */
function mergeSpans(spans: StyledSpan[]): StyledSpan[] {
  if (spans.length <= 1) return spans;

  const merged: StyledSpan[] = [];
  let current = { ...spans[0]! };

  for (let i = 1; i < spans.length; i++) {
    const next = spans[i]!;
    if (
      current.fg === next.fg &&
      current.bg === next.bg &&
      current.bold === next.bold &&
      current.dim === next.dim
    ) {
      current.text += next.text;
    } else {
      if (current.text) merged.push(current);
      current = { ...next };
    }
  }

  if (current.text) merged.push(current);
  return merged;
}

/** Check if text contains [[]] markup. */
export function hasMarkup(text: string): boolean {
  return typeof text === 'string' && text.includes('[[');
}

/** Strip all markup and return plain text. */
export function stripMarkup(text: string): string {
  if (!text) return '';
  return text.replace(/\[\[[^\]]+\]\]/g, '');
}
