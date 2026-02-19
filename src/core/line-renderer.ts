/**
 * Terminal line rendering — converts animation frames to SVG elements.
 * Handles command lines (with typing animation) and output lines (with fade-in).
 */

import type { AnimationFrame, ChromeConfig, StyledSpan, TerminalTextConfig, ThemeColors } from '../types.js';
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
  const charDuration = command.length > 0 ? typingDuration / command.length : 0;
  const typingEndTime = startTime + typingDuration;
  const blinkDur = `${cursorBlinkCycle}ms`;

  const moveAnims = command.split('').map((_, idx) => {
    const charAppearTime = startTime + (idx * charDuration);
    const fromX = roundCoord(promptWidth + (idx * charWidth));
    const toX = roundCoord(promptWidth + ((idx + 1) * charWidth));
    return `<animate attributeName="x" from="${fromX}" to="${toX}" begin="${charAppearTime}ms" dur="1ms" fill="freeze"/>`;
  }).join('');

  return `
    <rect x="${promptWidth}" y="${cursorY}" width="${charWidth}" height="${terminal.fontSize}"
          fill="${cursorColor}" opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      <animate attributeName="opacity" values="1;1;0;0" dur="${blinkDur}" begin="${startTime}ms" end="${typingEndTime}ms" repeatCount="indefinite"/>
      <animate attributeName="opacity" to="0" begin="${typingEndTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      ${moveAnims}
    </rect>`;
}

/** Generate a command line with character-by-character typing animation. */
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
  textGlow: boolean,
  cursorBlinkCycle: number,
  charAppearDuration: number,
): string {
  const promptWidth = getTextWidth(prompt, terminal.fontSize);
  const charDuration = command.length > 0 ? typingDuration / command.length : 0;
  const filter = textGlow ? ' filter="url(#textGlow)"' : '';

  const typedChars = command.split('').map((char, i) => {
    const charStart = startTime + (i * charDuration);
    return `<tspan opacity="0">${escapeXml(char)}<animate attributeName="opacity" from="0" to="1" begin="${charStart}ms" dur="${charAppearDuration}ms" fill="freeze"/></tspan>`;
  }).join('');

  return `
    <g id="line-${lineIndex}" transform="translate(0, ${y})">
      <text font-family="${terminal.fontFamily}" font-size="${terminal.fontSize}"
            fill="${promptColor}"${filter} xml:space="preserve" opacity="0">
        ${escapeXml(prompt)}
        <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      </text>
      <text x="${promptWidth}" font-family="${terminal.fontFamily}"
            font-size="${terminal.fontSize}" fill="${promptColor}"${filter} xml:space="preserve">
        ${typedChars}
      </text>
      ${generateCursor(prompt, command, startTime, typingDuration, terminal, cursorColor, cursorBlinkCycle, charAppearDuration)}
    </g>`;
}

/** Generate an output line with fade-in animation. */
function generateOutputLine(
  lineIndex: number,
  y: number,
  content: string,
  color: string,
  startTime: number,
  terminal: TerminalTextConfig,
  colors: ThemeColors,
  textGlow: boolean,
  chrome: ChromeConfig,
  charAppearDuration: number,
): string {
  const colorMap = buildColorMap(colors);
  const filter = textGlow ? ' filter="url(#textGlow)"' : '';

  const textContent = hasMarkup(content)
    ? generateStyledText(parseMarkup(content, colorMap, color), color, chrome.dimOpacity)
    : escapeXml(content);

  const textFill = hasMarkup(content) ? '' : ` fill="${color}"`;

  return `
    <g id="line-${lineIndex}" transform="translate(0, ${y})" opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${startTime}ms" dur="${charAppearDuration}ms" fill="freeze"/>
      <text font-family="${terminal.fontFamily}" font-size="${terminal.fontSize}"
            ${textFill}${filter} xml:space="preserve">
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
  textGlow: boolean,
  chrome?: ChromeConfig,
): string {
  const chromeConfig = chrome ?? DEFAULT_CHROME;
  const cursorBlinkCycle = DEFAULT_ANIMATION.cursorBlinkCycle;
  const charAppearDuration = DEFAULT_ANIMATION.charAppearDuration;
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
          frame.typingDuration ?? DEFAULT_ANIMATION.defaultTypingDuration,
          terminal, colors.prompt, colors.cursor, textGlow,
          cursorBlinkCycle, charAppearDuration,
        ),
      );
    } else if (frame.type === 'add-output' && frame.lineIndex !== undefined) {
      const y = roundCoord(frame.lineIndex * lineHeight);
      processedLines.set(
        frame.lineIndex,
        generateOutputLine(
          frame.lineIndex, y,
          frame.content ?? '',
          frame.color ?? colors.text,
          frame.time,
          terminal, colors, textGlow,
          chromeConfig, charAppearDuration,
        ),
      );
    }
  }

  return Array.from(processedLines.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, content]) => content)
    .join('\n');
}
