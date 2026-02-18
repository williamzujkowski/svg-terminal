/**
 * ASCII Box Generator — creates formatted boxes for terminal output.
 *
 * Supports multiple styles: double, rounded, single, heavy, dashed.
 */

import type { BoxChars, BoxConfig, BoxStyle } from '../types.js';

/** Character sets for each box style. */
export const BOX_STYLES: Record<BoxStyle, BoxChars> = {
  double: {
    topLeft: '\u2554', topRight: '\u2557',
    bottomLeft: '\u255A', bottomRight: '\u255D',
    horizontal: '\u2550', vertical: '\u2551',
    separatorLeft: '\u2560', separatorRight: '\u2563',
  },
  rounded: {
    topLeft: '\u256D', topRight: '\u256E',
    bottomLeft: '\u2570', bottomRight: '\u256F',
    horizontal: '\u2500', vertical: '\u2502',
    separatorLeft: '\u251C', separatorRight: '\u2524',
  },
  single: {
    topLeft: '\u250C', topRight: '\u2510',
    bottomLeft: '\u2514', bottomRight: '\u2518',
    horizontal: '\u2500', vertical: '\u2502',
    separatorLeft: '\u251C', separatorRight: '\u2524',
  },
  heavy: {
    topLeft: '\u250F', topRight: '\u2513',
    bottomLeft: '\u2517', bottomRight: '\u251B',
    horizontal: '\u2501', vertical: '\u2503',
    separatorLeft: '\u2523', separatorRight: '\u252B',
  },
  dashed: {
    topLeft: '\u250C', topRight: '\u2510',
    bottomLeft: '\u2514', bottomRight: '\u2518',
    horizontal: '\u2504', vertical: '\u2506',
    separatorLeft: '\u251C', separatorRight: '\u2524',
  },
};

/**
 * Calculate display width of a string, accounting for emoji.
 * Emoji display as 2 characters wide in monospace fonts.
 */
export function getDisplayWidth(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\x1b\[[0-9;]*m/g, '');
  let width = 0;

  for (const char of cleaned) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x1F300 && code <= 0x1F9FF) ||
      (code >= 0x2600 && code <= 0x26FF) ||
      (code >= 0x2700 && code <= 0x27BF) ||
      (code >= 0x1F600 && code <= 0x1F64F) ||
      (code >= 0x1F680 && code <= 0x1F6FF)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/** Pad a string to a target display width. */
export function padToWidth(str: string, targetWidth: number, padChar = ' '): string {
  const padding = Math.max(0, targetWidth - getDisplayWidth(str));
  return str + padChar.repeat(padding);
}

/** Truncate a string to a maximum display width with ellipsis. */
export function truncateToWidth(str: string, maxWidth: number): string {
  if (getDisplayWidth(str) <= maxWidth) return str;

  let width = 0;
  let result = '';
  for (const char of str) {
    const charWidth = getDisplayWidth(char);
    if (width + charWidth + 3 > maxWidth) return result + '...';
    result += char;
    width += charWidth;
  }
  return result;
}

/** Wrap text to fit within a max width, breaking at word boundaries. */
export function wrapText(text: string, maxWidth: number, indent = ''): string[] {
  if (!text || getDisplayWidth(text) <= maxWidth) return [text || ''];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  const indentWidth = getDisplayWidth(indent);

  for (const word of words) {
    const wordWidth = getDisplayWidth(word);
    const lineWidth = getDisplayWidth(currentLine);
    const effectiveMax = lines.length === 0 ? maxWidth : maxWidth - indentWidth;

    if (currentLine === '') {
      currentLine = lines.length > 0 ? indent + word : word;
    } else if (lineWidth + 1 + wordWidth <= effectiveMax) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = indent + word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Create an ASCII box with automatic padding and alignment. */
export function createBox(config: BoxConfig): string {
  const { style = 'double', width = 56, lines = [], separatorAfter = [], truncate = true } = config;

  const chars = BOX_STYLES[style];
  const innerWidth = width - 4; // 2 borders + 2 padding spaces
  const result: string[] = [];

  // Top border
  result.push(chars.topLeft + chars.horizontal.repeat(width - 2) + chars.topRight);

  // Content lines
  lines.forEach((line, index) => {
    let content = line;
    if (truncate && getDisplayWidth(content) > innerWidth) {
      content = truncateToWidth(content, innerWidth);
    }
    const padded = padToWidth(content, innerWidth);
    result.push(chars.vertical + ' ' + padded + ' ' + chars.vertical);

    if (separatorAfter?.includes(index)) {
      result.push(chars.separatorLeft + chars.horizontal.repeat(width - 2) + chars.separatorRight);
    }
  });

  // Bottom border
  result.push(chars.bottomLeft + chars.horizontal.repeat(width - 2) + chars.bottomRight);

  return result.join('\n');
}

/** Convenience: create a double-line box. */
export function createDoubleBox(lines: string[], width = 56, separatorAfter?: number[]): string {
  return createBox({ style: 'double', width, lines, separatorAfter });
}

/** Convenience: create a rounded box. */
export function createRoundedBox(lines: string[], width = 48, separatorAfter?: number[]): string {
  return createBox({ style: 'rounded', width, lines, separatorAfter });
}

/** Create a titled box with a header section separated from content. */
export function createTitledBox(opts: {
  title: string;
  subtitle?: string;
  content: string[];
  width?: number;
  style?: BoxStyle;
}): string {
  const { title, subtitle, content = [], width = 56, style = 'double' } = opts;
  const lines = ['', title];
  if (subtitle) lines.push(subtitle);
  const separatorIndex = lines.length - 1;
  lines.push(...content);
  return createBox({ style, width, lines, separatorAfter: [separatorIndex] });
}
