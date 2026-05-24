/**
 * Terminal line rendering — converts animation frames to SVG elements.
 * Handles command lines (with typing animation) and output lines (with fade-in).
 */

import type { AnimationConfig, AnimationFrame, ChromeConfig, StyledSpan, TerminalTextConfig, ThemeColors } from '../types.js';
import { buildColorMap, hasMarkup, parseMarkup } from './markup-parser.js';
import { escapeXml, getTextWidth, roundCoord } from './xml.js';
import { CHAR_WIDTH_RATIO, CURSOR_Y_OFFSET_RATIO, DEFAULT_ANIMATION, DEFAULT_CHROME } from './defaults.js';

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

/** Generate a blinking cursor that follows typing. */
function generateCursor(
  prompt: string,
  command: string,
  startTime: number,
  typingDuration: number,
  terminal: TerminalTextConfig,
  cursorColor: string,
  cursorBlinkCycle: number,
  charAppearDuration: number,
): string {
  const promptWidth = getTextWidth(prompt, terminal.fontSize);
  const charWidth = roundCoord(terminal.fontSize * CHAR_WIDTH_RATIO);
  const cursorY = roundCoord(terminal.fontSize * CURSOR_Y_OFFSET_RATIO);
  const typingEndTime = startTime + typingDuration;
  const blinkDur = `${cursorBlinkCycle}ms`;

  // One discrete-step <animate> walks the cursor across N+1 positions
  // instead of N per-character animates. Visually identical because the
  // old per-char animates were dur=1ms (already effectively discrete).
  const moveAnim = command.length > 0
    ? buildCursorWalk(command.length, promptWidth, charWidth, startTime, typingDuration)
    : '';

  return `
    <rect x="${promptWidth}" y="${cursorY}" width="${charWidth}" height="${terminal.fontSize}"
          fill="${cursorColor}" opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      <animate attributeName="opacity" values="1;1;0;0" dur="${blinkDur}" begin="${startTime}ms" end="${typingEndTime}ms" repeatCount="indefinite"/>
      <animate attributeName="opacity" to="0" begin="${typingEndTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      ${moveAnim}
    </rect>`;
}

/** Single discrete <animate> that steps cursor x through N+1 positions. */
function buildCursorWalk(
  charCount: number, promptWidth: number, charWidth: number,
  startTime: number, typingDuration: number,
): string {
  // values[i] = cursor x after i characters typed (i ∈ 0..N).
  // keyTimes[i] = i / N — cursor jumps to next position at each char-reveal time.
  const values: string[] = [];
  const keyTimes: string[] = [];
  for (let i = 0; i <= charCount; i++) {
    values.push(String(roundCoord(promptWidth + i * charWidth)));
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

  return `
    <g id="line-${lineIndex}" transform="translate(0, ${y})">
      ${revealClip}
      <text class="tt" fill="${promptColor}" opacity="0">
        ${escapeXml(prompt)}
        <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      </text>
      <text class="tt" x="${promptWidth}" fill="${promptColor}"${command.length > 0 ? ` clip-path="url(#${clipId})"` : ''}>${escapeXml(command)}</text>
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
  return `<defs><clipPath id="${clipId}"><rect x="${startX}" y="${-fontSize}" width="0" height="${fontSize * 2}"><animate attributeName="width" values="${values.join(';')}" keyTimes="${keyTimes.join(';')}" calcMode="discrete" begin="${startTime}ms" dur="${typingDuration}ms" fill="freeze"/></rect></clipPath></defs>`;
}

/** Generate an output line with fade-in animation. */
/**
 * Generate an animated output line with N frames cycling via SMIL opacity.
 * Each frame renders as its own <text> at the same y; only one is visible per
 * cycle slot. Opacity uses calcMode="discrete" (no interpolation) so the
 * transition is instantaneous like a sprite swap.
 */
function generateAnimatedOutputLine(
  lineIndex: number,
  y: number,
  frames: string[],
  color: string,
  startTime: number,
  colorMap: Record<string, string>,
  chrome: ChromeConfig,
  charAppearDuration: number,
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
    <g id="line-${lineIndex}" transform="translate(0, ${y})" opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      ${textElements}
    </g>`;
}

function generateOutputLine(
  lineIndex: number,
  y: number,
  content: string,
  color: string,
  startTime: number,
  colorMap: Record<string, string>,
  chrome: ChromeConfig,
  charAppearDuration: number,
): string {
  const styled = hasMarkup(content);
  const textContent = styled
    ? generateStyledText(parseMarkup(content, colorMap, color), color, chrome.dimOpacity)
    : escapeXml(content);
  const textFill = styled ? '' : ` fill="${color}"`;

  return `
    <g id="line-${lineIndex}" transform="translate(0, ${y})" opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      <text class="tt"${textFill}>
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
      const y = roundCoord(frame.lineIndex * lineHeight);
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
      const y = roundCoord(frame.lineIndex * lineHeight);
      if (frame.frames && frame.frames.length > 0) {
        processedLines.set(
          frame.lineIndex,
          generateAnimatedOutputLine(
            frame.lineIndex, y,
            frame.frames,
            frame.color ?? colors.text,
            frame.time,
            colorMap,
            chromeConfig, animConfig.charAppearDuration,
            frame.framesFps ?? 4,
            frame.framesLoop ?? true,
          ),
        );
      } else {
        processedLines.set(
          frame.lineIndex,
          generateOutputLine(
            frame.lineIndex, y,
            frame.content ?? '',
            frame.color ?? colors.text,
            frame.time,
            colorMap,
            chromeConfig, animConfig.charAppearDuration,
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
