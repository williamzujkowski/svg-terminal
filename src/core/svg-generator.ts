/**
 * SVG Terminal Generator — creates animated SVG terminals from sequences.
 * This is the core rendering engine: sequences in, SVG string out.
 */

import type {
  AnimationFrame,
  EffectsConfig,
  Sequence,
  TerminalConfig,
  TerminalTextConfig,
  Theme,
  WindowConfig,
} from '../types.js';
import { generateDefs, generateFilters } from './effects.js';
import { generateAllLines } from './line-renderer.js';
import { escapeXml, roundCoord } from './xml.js';

/** Generate an animated SVG terminal from a sequence of commands/outputs. */
export function generateSvg(sequences: Sequence[], config: TerminalConfig): string {
  const { window, text: terminal, theme, effects } = config;
  const lineHeight = terminal.fontSize * terminal.lineHeight;
  const topPadding = terminal.paddingTop;
  const viewportHeight = window.height - window.titleBarHeight - topPadding - terminal.padding;
  const maxVisibleLines = Math.floor(viewportHeight / lineHeight);

  const { frames } = createAnimationFrames(sequences, terminal, maxVisibleLines, config.scrollDuration);

  return `<svg width="${window.width}" height="${window.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${generateDefs(effects)}
    ${generateFilters(effects)}
  </defs>

  <g${effects.shadow ? ' filter="url(#shadow)"' : ''}>
    ${renderWindow(window, theme)}
    ${renderTitleBar(window, terminal, theme)}
    ${renderTerminalContent(window, terminal, theme, effects, frames, maxVisibleLines, lineHeight)}
  </g>
</svg>`;
}

// ============================================================================
// Animation frame creation
// ============================================================================

interface FrameResult {
  frames: AnimationFrame[];
  totalDuration: number;
}

function createAnimationFrames(
  sequences: Sequence[],
  terminal: TerminalTextConfig,
  maxVisibleLines: number,
  scrollDuration: number,
): FrameResult {
  let currentTime = 0;
  const frames: AnimationFrame[] = [];
  const buffer: unknown[] = [];
  let bufferStart = 0;

  for (const seq of sequences) {
    currentTime += seq.delay ?? 0;

    if (seq.type === 'command') {
      buffer.push({ type: 'command' });

      if (buffer.length - bufferStart > maxVisibleLines) {
        frames.push({
          time: currentTime,
          type: 'scroll',
          scrollLines: 1,
          bufferStart: ++bufferStart,
        });
        frames.push({
          time: currentTime + scrollDuration + 10,
          type: 'add-command',
          lineIndex: buffer.length - 1,
          prompt: seq.prompt ?? terminal.prompt,
          command: seq.content,
          typingDuration: seq.typingDuration ?? 2000,
        });
        currentTime += scrollDuration + 10;
      } else {
        frames.push({
          time: currentTime,
          type: 'add-command',
          lineIndex: buffer.length - 1,
          prompt: seq.prompt ?? terminal.prompt,
          command: seq.content,
          typingDuration: seq.typingDuration ?? 2000,
        });
      }

      currentTime += seq.typingDuration ?? 2000;
    } else {
      // output
      const lines = seq.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const baseTime = currentTime + (i * 50);
        buffer.push({ type: 'output' });

        if (buffer.length - bufferStart > maxVisibleLines) {
          frames.push({
            time: baseTime,
            type: 'scroll',
            scrollLines: 1,
            bufferStart: ++bufferStart,
          });
          frames.push({
            time: baseTime + scrollDuration + 10,
            type: 'add-output',
            lineIndex: buffer.length - 1,
            content: lines[i],
            color: seq.color,
          });
        } else {
          frames.push({
            time: baseTime,
            type: 'add-output',
            lineIndex: buffer.length - 1,
            content: lines[i],
            color: seq.color,
          });
        }
      }
      currentTime += lines.length * 50 + 200;
    }

    currentTime += seq.pause ?? 1000;
  }

  frames.push({ time: currentTime, type: 'final' });
  return { frames, totalDuration: currentTime };
}

// ============================================================================
// SVG rendering helpers
// ============================================================================

function renderWindow(window: WindowConfig, theme: Theme): string {
  return `
    <rect x="0" y="0" width="${window.width}" height="${window.height}"
          rx="${window.borderRadius}" ry="${window.borderRadius}"
          fill="${theme.colors.background}"/>`;
}

function renderTitleBar(window: WindowConfig, terminal: TerminalTextConfig, theme: Theme): string {
  return `
    <rect x="0" y="0" width="${window.width}" height="${window.titleBarHeight}"
          rx="${window.borderRadius}" ry="${window.borderRadius}"
          fill="${theme.colors.titleBarBackground}"/>
    <rect x="0" y="16" width="${window.width}" height="16"
          fill="${theme.colors.titleBarBackground}"/>
    <g id="window-controls">
      <circle cx="${terminal.padding + 2}" cy="16" r="6" fill="${theme.buttons.close}"/>
      <circle cx="${terminal.padding + 22}" cy="16" r="6" fill="${theme.buttons.minimize}"/>
      <circle cx="${terminal.padding + 42}" cy="16" r="6" fill="${theme.buttons.maximize}"/>
    </g>
    <text x="${window.width / 2}" y="21"
          font-family="${terminal.fontFamily}" font-size="13"
          fill="${theme.colors.titleBarText}" text-anchor="middle">
      ${escapeXml(window.title)}
    </text>`;
}

function renderTerminalContent(
  window: WindowConfig,
  terminal: TerminalTextConfig,
  theme: Theme,
  effects: EffectsConfig,
  frames: AnimationFrame[],
  _maxVisibleLines: number,
  lineHeight: number,
): string {
  const contentY = window.titleBarHeight + terminal.paddingTop;
  const viewportHeight = window.height - window.titleBarHeight;

  const scrollAnimations = renderScrollAnimations(frames, terminal, lineHeight);
  const allLines = generateAllLines(frames, terminal, lineHeight, theme.colors, effects.textGlow);

  return `
    <defs>
      <clipPath id="terminalViewport">
        <rect x="0" y="${window.titleBarHeight}" width="${window.width}" height="${viewportHeight}"/>
      </clipPath>
    </defs>
    <rect x="0" y="${window.titleBarHeight}" width="${window.width}"
          height="${viewportHeight}" fill="${theme.colors.background}"/>
    <g clip-path="url(#terminalViewport)">
      <g id="scrollContainer" transform="translate(${terminal.padding}, ${contentY})">
        ${scrollAnimations}
        ${allLines}
      </g>
    </g>`;
}

function renderScrollAnimations(
  frames: AnimationFrame[],
  terminal: TerminalTextConfig,
  lineHeight: number,
): string {
  const scrollFrames = frames.filter(f => f.type === 'scroll');
  const roundedLineHeight = roundCoord(lineHeight);
  let totalScroll = 0;

  return scrollFrames.map(frame => {
    const scrollAmount = (frame.scrollLines ?? 1) * roundedLineHeight;
    const fromY = roundCoord(terminal.padding + 32 - totalScroll);
    totalScroll += scrollAmount;
    const toY = roundCoord(terminal.padding + 32 - totalScroll);

    return `
        <animateTransform
          attributeName="transform" type="translate"
          from="${terminal.padding} ${fromY}" to="${terminal.padding} ${toY}"
          begin="${frame.time}ms" dur="100ms" fill="freeze"/>`;
  }).join('');
}
