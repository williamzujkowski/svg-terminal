/** Font-independent borders for complete rows of terminal boxes. */
import type { StyledSpan } from '../types.js';
import { BOX_STYLES, getDisplayWidth } from './box-generator.js';
import { CHAR_WIDTH_RATIO } from './defaults.js';
import { parseMarkup } from './markup-parser.js';
import { escapeXml } from './xml.js';

/** Returns undefined for ordinary text/art so its existing layout is preserved. */
export function renderBoxRow(
  content: string, colorMap: Record<string, string>, color: string,
  fontSize: number, lineHeight: number, dimOpacity: number,
): string | undefined {
  const spans = parseMarkup(content, colorMap, color);
  const plain = spans.map(span => span.text).join('');
  const row = plain.trim();
  const style = Object.values(BOX_STYLES).find(chars =>
    [[chars.topLeft, chars.topRight], [chars.bottomLeft, chars.bottomRight],
      [chars.separatorLeft, chars.separatorRight], [chars.vertical, chars.vertical]]
      .some(([left, right], index) => row.startsWith(left!) && row.endsWith(right!) &&
        (index === 3 || [...row.slice(1, -1)].every(char => char === chars.horizontal))));
  if (!style || row.length < 2) return undefined;
  const top = row.startsWith(style.topLeft);
  const bottom = row.startsWith(style.bottomLeft);
  const separator = row.startsWith(style.separatorLeft);
  if ((top || bottom || separator) &&
      [...row.slice(1, -1)].some(char => char !== style.horizontal)) return undefined;

  const cell = fontSize * CHAR_WIDTH_RATIO;
  const prefix = plain.length - plain.trimStart().length;
  const left = (prefix + 0.5) * cell;
  const right = left + (getDisplayWidth(row) - 1) * cell;
  const center = -fontSize * 0.35;
  const upper = center - lineHeight / 2;
  const lower = center + lineHeight / 2;
  const n = (value: number): string => String(+value.toFixed(3));
  const double = style.vertical === '║';
  const heavy = style.vertical === '┃';
  const rounded = style.topLeft === '╭';
  const offsets = double ? [-fontSize * 0.08, fontSize * 0.08] : [0];
  const paths = offsets.map(offset => {
    const x1 = left + offset;
    const x2 = right - offset;
    const y = center + (bottom ? -offset : offset);
    let d: string;
    if (top || bottom) {
      const edge = top ? lower : upper;
      const radius = rounded ? cell / 2 : 0;
      const bend = top ? y + radius : y - radius;
      d = `M${n(x1)} ${n(edge)}V${n(bend)}Q${n(x1)} ${n(y)} ${n(x1 + radius)} ${n(y)}H${n(x2 - radius)}Q${n(x2)} ${n(y)} ${n(x2)} ${n(bend)}V${n(edge)}`;
    } else {
      d = `M${n(x1)} ${n(upper)}V${n(lower)}M${n(x2)} ${n(upper)}V${n(lower)}`;
      if (separator) d += `M${n(x1)} ${n(y)}H${n(x2)}`;
    }
    return d;
  }).join('');
  // Stroke geometry meets adjacent rows halfway between their baselines.
  // It scales with the SVG and never depends on a mobile font's box glyphs.
  const borderSpan = spans.find(span => /[╔╚╠║╭╰┌└├│┏┗┣┃┆]/u.test(span.text));
  const stroke = borderSpan?.fg ?? color;
  const dash = style.vertical === '┆' ? ` stroke-dasharray="${n(fontSize * 0.2)} ${n(fontSize * 0.15)}"` : '';
  const opacity = borderSpan?.dim ? ` opacity="${dimOpacity}"` : '';
  const border = `<path fill="none" stroke="${escapeXml(stroke)}" stroke-width="${n(fontSize * (heavy ? 0.12 : 0.065))}"${dash}${opacity} d="${paths}"/>`;
  if (top || bottom || separator) return border;

  // Pin each styled run independently: emoji and font fallbacks cannot move
  // the right border, and a color change cannot redistribute whitespace.
  let column = 0;
  let index = 0;
  const end = prefix + row.length - 1;
  const text = spans.map((span: StyledSpan) => {
    const start = column;
    const visible = [...span.text].map(char => {
      const position = index;
      index += char.length;
      return position === prefix || position === end ? ' ' : char;
    }).join('');
    const width = getDisplayWidth(visible) * cell;
    column += getDisplayWidth(visible);
    const attrs = `${span.bold ? ' font-weight="bold"' : ''}${span.dim ? ` opacity="${dimOpacity}"` : ''}`;
    return visible ? `<tspan x="${n(start * cell)}" fill="${escapeXml(span.fg ?? color)}" textLength="${n(width)}" lengthAdjust="spacingAndGlyphs"${attrs}>${escapeXml(visible)}</tspan>` : '';
  }).join('');
  return `${border}<text class="tt">${text}</text>`;
}
