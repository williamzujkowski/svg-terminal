/**
 * Terminal line rendering — converts animation frames to SVG elements.
 * Handles command lines (with typing animation) and output lines (with fade-in).
 */

import type { AnimationConfig, AnimationFrame, ChromeConfig, StyledSpan, TerminalTextConfig, ThemeColors } from '../types.js';
import { buildColorMap, hasMarkup, parseMarkup } from './markup-parser.js';
import { escapeXml, getTextWidth, roundCoord } from './xml.js';
import { CHAR_WIDTH_RATIO, CURSOR_Y_OFFSET_RATIO, DEFAULT_ANIMATION, DEFAULT_CHROME } from './defaults.js';

/**
 * SMIL `<set>` that holds an attribute at a value until `untilMs`, then
 * releases. Still used for the clip-path width animation (the typing reveal
 * is inherently SMIL — no CSS equivalent for animating a clipPath rect's
 * width with discrete keyframes). For opacity fade-ins we now use CSS
 * keyframes instead — see fadeInStyle below.
 */
function setHold(attr: string, value: string | number, untilMs: number): string {
  if (untilMs <= 0) return '';
  return `<set attributeName="${attr}" to="${value}" begin="0s" end="${untilMs}ms"/>`;
}

/**
 * CSS `class` + inline `style` that drives an opacity fade-in via the
 * `@keyframes fadeIn` rule in the SVG `<style>` block. Replaces what was a
 * SMIL `<animate attributeName="opacity">` + `<set>` pair. Two reasons:
 *
 *  1. `prefers-reduced-motion` (#71). The SVG already wraps its CSS animations
 *     in a `@media (prefers-reduced-motion: reduce)` block that clamps
 *     animation-duration to 0.01ms. SMIL can't be controlled from CSS, so
 *     migrating fade-ins to CSS automatically picks up that respect. (The
 *     typing reveal, cursor walk, scroll, and frame cycle remain SMIL — those
 *     can't move and still ignore reduced-motion. Documented limitation.)
 *
 *  2. SMIL-stripped fallback. Renderers that strip animation see the bare
 *     element with no opacity attribute → renders at default 1 (visible).
 *     The CSS fade-in is itself often stripped or no-op in those contexts —
 *     either way the static state is correct. `fill-mode: backwards` means
 *     the element stays at opacity 0 during the animation-delay window, so
 *     content doesn't pop in early.
 */
function fadeInStyle(startTimeMs: number): string {
  return ` class="fade-in" style="animation-delay: ${startTimeMs}ms"`;
}

/** Round a line-position y to 1 decimal place to avoid the +1px wobble on
 *  every 5th row that `roundCoord(i * 25.2)` produced. Fractional y values
 *  are anti-aliased fine by every SVG renderer; saving 0–2 bytes per line
 *  via integer truncation wasn't worth the visible jitter. */
function roundLineY(n: number): number {
  return +(n.toFixed(1));
}

/** Generate SVG tspan elements from styled spans. */
function generateStyledText(
  spans: StyledSpan[],
  defaultColor: string,
  dimOpacity: number,
): string {
  return spans.map(span => {
    const color = span.fg ?? defaultColor;
    const attrs = [`fill="${color}"`];
    if (span.bold) attrs.push('font-weight="bold"');
    if (span.dim) attrs.push(`opacity="${dimOpacity}"`);
    return `<tspan ${attrs.join(' ')}>${escapeXml(span.text)}</tspan>`;
  }).join('');
}

/**
 * Cursor that rides the typing front.
 *
 * Decided by nexus consensus vote, 100% approval (option A):
 *  - Cursor sits ON the most-recently-emerged character, not after it. Before
 *    any char is typed it sits at column 0 (where char 0 will appear). When
 *    char k emerges, the cursor jumps to column k — riding the typing front,
 *    never leading it.
 *  - Cursor is SOLID visible the whole typing window. The pre-fix `values="1;1;0;0"`
 *    blink was making the cursor invisible for ~333 ms out of every 1000 ms; chars
 *    would appear without a visible cursor and the cursor seemed to "catch up"
 *    at the end. `cursorBlinkCycle` stays in the config schema for back-compat
 *    but no longer applies during typing.
 *  - Fades in at startTime, fades out at typingEndTime so the next command line's
 *    cursor takes over cleanly.
 */
function generateCursor(
  prompt: string,
  command: string,
  startTime: number,
  typingDuration: number,
  terminal: TerminalTextConfig,
  cursorColor: string,
  _cursorBlinkCycle: number,
  charAppearDuration: number,
): string {
  const promptWidth = getTextWidth(prompt, terminal.fontSize);
  const charWidth = roundCoord(terminal.fontSize * CHAR_WIDTH_RATIO);
  const cursorY = roundCoord(terminal.fontSize * CURSOR_Y_OFFSET_RATIO);
  const typingEndTime = startTime + typingDuration;

  const moveAnim = command.length > 0
    ? buildCursorWalk(command.length, promptWidth, charWidth, startTime, typingDuration)
    : '';

  return `
    <rect x="${promptWidth}" y="${cursorY}" width="${charWidth}" height="${terminal.fontSize}"
          fill="${cursorColor}" opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      <animate attributeName="opacity" to="0" begin="${typingEndTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      ${moveAnim}
    </rect>`;
}

/**
 * Single discrete <animate> that steps cursor x through N+1 positions.
 * Lag-by-one shape: values[k] for k≥1 is the column of the (k-1)-th char
 * (the one that just emerged at keyTime k/N). values[0] is column 0.
 */
function buildCursorWalk(
  charCount: number, promptWidth: number, charWidth: number,
  startTime: number, typingDuration: number,
): string {
  const values: string[] = [];
  const keyTimes: string[] = [];
  for (let i = 0; i <= charCount; i++) {
    // i=0: nothing emerged yet → cursor sits where char 0 will appear.
    // i≥1: char (i-1) just emerged → cursor sits on column (i-1).
    const col = Math.max(0, i - 1);
    values.push(String(roundCoord(promptWidth + col * charWidth)));
    keyTimes.push((i / charCount).toFixed(4));
  }
  return `<animate attributeName="x" values="${values.join(';')}" keyTimes="${keyTimes.join(';')}" calcMode="discrete" begin="${startTime}ms" dur="${typingDuration}ms" fill="freeze"/>`;
}

/**
 * Generate a command line with character-by-character typing animation.
 *
 * Per-character `<tspan opacity="0">char<animate.../></tspan>` is replaced by
 * a single animated clip-path whose `width` discretely grows as each
 * character reveal time elapses. One animate per command instead of N.
 * `charAppearDuration` is no longer honored for the per-character fade —
 * the field is kept in the schema/types for back-compat but is functionally
 * a no-op for typed characters (it still drives the prompt fade-in).
 */
function generateCommandLine(
  lineIndex: number,
  y: number,
  prompt: string,
  command: string,
  startTime: number,
  typingDuration: number,
  terminal: TerminalTextConfig,
  promptColor: string,
  cursorColor: string,
  cursorBlinkCycle: number,
  charAppearDuration: number,
): string {
  const promptWidth = getTextWidth(prompt, terminal.fontSize);
  const charWidth = roundCoord(terminal.fontSize * CHAR_WIDTH_RATIO);
  const clipId = `cmdrev-${lineIndex}`;
  const revealClip = command.length > 0
    ? buildRevealClip(clipId, promptWidth, charWidth, command.length, terminal.fontSize, startTime, typingDuration)
    : '';

  // textLength + lengthAdjust pin the rendered width to our getTextWidth math.
  // Without this, the prompt and typed text use whatever monospace fallback
  // the viewer's browser picks — and if its advance ≠ CHAR_WIDTH_RATIO (0.6),
  // the prompt's actual glyphs extend past x=promptWidth and overlap the
  // typed text (which is positioned AT promptWidth). spacingAndGlyphs scales
  // glyphs minutely (~5%) to make total width match exactly.
  const cmdWidth = command.length * charWidth;
  // Prompt fades in via CSS .fade-in + animation-delay so reduced-motion
  // honors it. charAppearDuration is no longer the duration (CSS uses the
  // .fade-in rule's 10ms) — kept in the schema for back-compat.
  return `
    <g transform="translate(0, ${y})">
      ${revealClip}
      <text class="tt fade-in" style="animation-delay: ${startTime}ms" fill="${promptColor}" textLength="${promptWidth}" lengthAdjust="spacingAndGlyphs">${escapeXml(prompt)}</text>
      <text class="tt" x="${promptWidth}" fill="${promptColor}"${command.length > 0 ? ` textLength="${cmdWidth}" lengthAdjust="spacingAndGlyphs" clip-path="url(#${clipId})"` : ''}>${escapeXml(command)}</text>
      ${generateCursor(prompt, command, startTime, typingDuration, terminal, cursorColor, cursorBlinkCycle, charAppearDuration)}
    </g>`;
}

/**
 * Single-animate clip-path that reveals N characters discretely.
 * Lives inside the line's transformed <g>, so coords are in line-local space.
 * The y range (-fontSize..fontSize) is generous; any monospace glyph fits.
 */
function buildRevealClip(
  clipId: string, startX: number, charWidth: number, charCount: number,
  fontSize: number, startTime: number, typingDuration: number,
): string {
  const values: string[] = [];
  const keyTimes: string[] = [];
  for (let i = 0; i <= charCount; i++) {
    values.push(String(roundCoord(i * charWidth)));
    keyTimes.push((i / charCount).toFixed(4));
  }
  // Static rect width = the FINAL value, not 0. SMIL-stripping renderers
  // see the rect at full width → typed text fully revealed. SMIL viewers see
  // the setHold pin width to 0 until startTime, then the animate steps it up.
  const finalWidth = roundCoord(charCount * charWidth);
  return `<defs><clipPath id="${clipId}"><rect x="${startX}" y="${-fontSize}" width="${finalWidth}" height="${fontSize * 2}">${setHold('width', 0, startTime)}<animate attributeName="width" values="${values.join(';')}" keyTimes="${keyTimes.join(';')}" calcMode="discrete" begin="${startTime}ms" dur="${typingDuration}ms" fill="freeze"/></rect></clipPath></defs>`;
}

/** Generate an output line with fade-in animation. */
/**
 * Generate an animated output line with N frames cycling via SMIL opacity.
 * Each frame renders as its own <text> at the same y; only one is visible per
 * cycle slot. Opacity uses calcMode="discrete" (no interpolation) so the
 * transition is instantaneous like a sprite swap.
 */
function generateAnimatedOutputLine(
  y: number,
  frames: string[],
  color: string,
  startTime: number,
  colorMap: Record<string, string>,
  chrome: ChromeConfig,
  fps: number,
  loop: boolean,
): string {
  const n = frames.length;
  const cycleDur = `${(n / fps).toFixed(3)}s`;
  const repeat = loop ? 'indefinite' : '1';
  const keyTimes = Array.from({ length: n + 1 }, (_, i) => (i / n).toFixed(4)).join(';');

  const textElements = frames.map((frame, i) => {
    const styled = hasMarkup(frame);
    const textContent = styled
      ? generateStyledText(parseMarkup(frame, colorMap, color), color, chrome.dimOpacity)
      : escapeXml(frame);
    const textFill = styled ? '' : ` fill="${color}"`;
    // Frame i is visible during [i/n, (i+1)/n). values[k] is what's shown
    // in [keyTimes[k], keyTimes[k+1]). values[n] is the wrap-around back to
    // frame 0; for frame 0 itself that's "1", otherwise "0".
    const values = Array.from({ length: n + 1 }, (_, k) =>
      k === i ? '1' : (k === n && i === 0 ? '1' : '0'),
    ).join(';');
    return `<text class="tt"${textFill} opacity="${i === 0 ? '1' : '0'}">${textContent}<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${cycleDur}" begin="${startTime}ms" repeatCount="${repeat}" fill="freeze"/></text>`;
  }).join('');

  return `
    <g transform="translate(0, ${y})"${fadeInStyle(startTime)}>
      ${textElements}
    </g>`;
}

function generateOutputLine(
  y: number,
  content: string,
  color: string,
  startTime: number,
  colorMap: Record<string, string>,
  chrome: ChromeConfig,
  pinWidth: boolean,
  fontSize: number,
): string {
  const styled = hasMarkup(content);
  const textContent = styled
    ? generateStyledText(parseMarkup(content, colorMap, color), color, chrome.dimOpacity)
    : escapeXml(content);
  const textFill = styled ? '' : ` fill="${color}"`;
  // pinWidth opt-in (#85): emit textLength + lengthAdjust so the rendered
  // width matches the math regardless of viewer's monospace fallback font.
  // Skip when the content has markup (parseMarkup produces multiple tspans
  // — textLength on the outer <text> would scale the spacing weirdly).
  const pin = pinWidth && !styled && content.length > 0
    ? ` textLength="${content.length * roundCoord(fontSize * CHAR_WIDTH_RATIO)}" lengthAdjust="spacingAndGlyphs"`
    : '';

  return `
    <g transform="translate(0, ${y})"${fadeInStyle(startTime)}>
      <text class="tt"${textFill}${pin}>
        ${textContent}
      </text>
    </g>`;
}

/** Generate all terminal line SVG elements from animation frames. */
export function generateAllLines(
  frames: AnimationFrame[],
  terminal: TerminalTextConfig,
  lineHeight: number,
  colors: ThemeColors,
  chrome?: ChromeConfig,
  animation?: AnimationConfig,
): string {
  const chromeConfig = chrome ?? DEFAULT_CHROME;
  const animConfig = animation ?? DEFAULT_ANIMATION;
  const colorMap = buildColorMap(colors);
  const processedLines = new Map<number, string>();

  for (const frame of frames) {
    if (frame.type === 'add-command' && frame.lineIndex !== undefined) {
      const y = roundLineY(frame.lineIndex * lineHeight);
      processedLines.set(
        frame.lineIndex,
        generateCommandLine(
          frame.lineIndex, y,
          frame.prompt ?? terminal.prompt,
          frame.command ?? '',
          frame.time,
          frame.typingDuration ?? animConfig.defaultTypingDuration,
          terminal, colors.prompt, colors.cursor,
          animConfig.cursorBlinkCycle, animConfig.charAppearDuration,
        ),
      );
    } else if (frame.type === 'add-output' && frame.lineIndex !== undefined) {
      const y = roundLineY(frame.lineIndex * lineHeight);
      if (frame.frames && frame.frames.length > 0) {
        processedLines.set(
          frame.lineIndex,
          generateAnimatedOutputLine(
            y,
            frame.frames,
            frame.color ?? colors.text,
            frame.time,
            colorMap,
            chromeConfig,
            frame.framesFps ?? 4,
            frame.framesLoop ?? true,
          ),
        );
      } else {
        processedLines.set(
          frame.lineIndex,
          generateOutputLine(
            y,
            frame.content ?? '',
            frame.color ?? colors.text,
            frame.time,
            colorMap,
            chromeConfig,
            frame.pinWidth ?? false,
            terminal.fontSize,
          ),
        );
      }
    }
  }

  return Array.from(processedLines.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, content]) => content)
    .join('\n');
}
