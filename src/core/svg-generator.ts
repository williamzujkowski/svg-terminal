/**
 * SVG Terminal Generator — creates animated SVG terminals from sequences.
 * This is the core rendering engine: sequences in, SVG string out.
 */

import type {
  AnimationConfig,
  AnimationFrame,
  ChromeConfig,
  EffectsConfig,
  Sequence,
  TerminalConfig,
  TerminalTextConfig,
  Theme,
  WindowConfig,
} from '../types.js';
import { generateDefs, generateFilters } from './effects.js';
import { generateAllLines } from './line-renderer.js';
import { buildColorMap, parseMarkup } from './markup-parser.js';
import { escapeXml, roundCoord } from './xml.js';
import { SCROLL_ANIM_DURATION } from './defaults.js';

// ============================================================================
// Auto-height calculation
// ============================================================================

/** Count total output lines from sequences (commands + output lines). */
function countTotalLines(sequences: Sequence[]): number {
  let total = 0;
  for (const seq of sequences) {
    if (seq.type === 'command') {
      total += 1;
    } else {
      total += seq.content.split('\n').length;
    }
  }
  return total;
}

/** Calculate auto-height from content, clamped to min/max. */
function calculateAutoHeight(
  sequences: Sequence[],
  window: WindowConfig,
  terminal: TerminalTextConfig,
): number {
  const lineHeight = terminal.fontSize * terminal.lineHeight;
  const totalLines = countTotalLines(sequences);
  const contentHeight = totalLines * lineHeight;
  const chromeHeight = window.titleBarHeight + terminal.paddingTop + terminal.padding * 2;
  const calculated = Math.ceil(contentHeight + chromeHeight);
  return Math.max(window.minHeight, Math.min(window.maxHeight, calculated));
}

// ============================================================================
// Main SVG generation
// ============================================================================

/** Generate an animated SVG terminal from a sequence of commands/outputs. */
export function generateSvg(sequences: Sequence[], config: TerminalConfig): string {
  const { text: terminal, theme, effects, animation, chrome } = config;
  const window = { ...config.window };

  // Auto-height: override window.height if enabled
  if (window.autoHeight) {
    window.height = calculateAutoHeight(sequences, window, terminal);
  }

  const lineHeight = terminal.fontSize * terminal.lineHeight;
  const titleBarHeight = getTitleBarHeight(window);
  const topPadding = terminal.paddingTop;
  const viewportHeight = window.height - titleBarHeight - topPadding - terminal.padding;
  const maxVisibleLines = Math.floor(viewportHeight / lineHeight);

  const maxDurationMs = config.maxDuration * 1000;
  const { frames, totalDuration } = createAnimationFrames(sequences, terminal, maxVisibleLines, config.scrollDuration, animation);

  if (totalDuration > maxDurationMs) {
    console.warn(`[svg-terminal] Animation duration (${(totalDuration / 1000).toFixed(1)}s) exceeds maxDuration (${config.maxDuration}s)`);
  }

  // Build accessibility label from block commands
  const accessibilityLabel = buildAccessibilityLabel(sequences);
  const showShadow = effects.shadow && window.style !== 'none';

  return `<svg width="${window.width}" height="${window.height}" xmlns="http://www.w3.org/2000/svg"
  role="img" aria-label="${escapeXml(accessibilityLabel)}">
  <style>
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
  <defs>
    ${generateDefs(effects)}
    ${generateFilters(effects)}
  </defs>

  <g${showShadow ? ' filter="url(#shadow)"' : ''}>
    ${renderWindow(window, theme)}
    ${renderTitleBarForStyle(window, terminal, theme, chrome)}
    ${renderTerminalContent(window, terminal, theme, effects, chrome, animation, frames, lineHeight)}
  </g>
</svg>`;
}

/** Build an accessibility label from the sequence commands. */
function buildAccessibilityLabel(sequences: Sequence[]): string {
  const commands = sequences
    .filter(s => s.type === 'command')
    .map(s => s.content)
    .slice(0, 5);
  if (commands.length === 0) return 'Animated terminal';
  return `Animated terminal showing: ${commands.join(', ')}`;
}

// ============================================================================
// Window style helpers
// ============================================================================

/** Get the effective title bar height based on window style. */
function getTitleBarHeight(window: WindowConfig): number {
  if (window.style === 'none' || window.style === 'floating' || window.style === 'minimal') {
    return 0;
  }
  return window.titleBarHeight;
}

/** Render the title bar based on window style. */
function renderTitleBarForStyle(
  window: WindowConfig,
  terminal: TerminalTextConfig,
  theme: Theme,
  chrome: ChromeConfig,
): string {
  if (window.style === 'none' || window.style === 'floating' || window.style === 'minimal') {
    return '';
  }
  return renderTitleBar(window, terminal, theme, chrome);
}

// ============================================================================
// Animation frame creation
// ============================================================================

interface FrameResult {
  frames: AnimationFrame[];
  totalDuration: number;
}

/** A line in the buffer — tracks type for scroll calculations. */
interface BufferLine {
  type: 'command' | 'output';
}

function createAnimationFrames(
  sequences: Sequence[],
  terminal: TerminalTextConfig,
  maxVisibleLines: number,
  scrollDuration: number,
  anim: AnimationConfig,
): FrameResult {
  let currentTime = 0;
  const frames: AnimationFrame[] = [];
  const buffer: BufferLine[] = [];
  let bufferStart = 0;

  for (const seq of sequences) {
    currentTime += seq.delay ?? 0;

    if (seq.type === 'command') {
      buffer.push({ type: 'command' });
      const typingDur = seq.typingDuration ?? anim.defaultTypingDuration;

      if (buffer.length - bufferStart > maxVisibleLines) {
        frames.push({
          time: currentTime,
          type: 'scroll',
          scrollLines: 1,
          bufferStart: ++bufferStart,
        });
        frames.push({
          time: currentTime + scrollDuration + anim.scrollDelay,
          type: 'add-command',
          lineIndex: buffer.length - 1,
          prompt: seq.prompt ?? terminal.prompt,
          command: seq.content,
          typingDuration: typingDur,
        });
        currentTime += scrollDuration + anim.scrollDelay;
      } else {
        frames.push({
          time: currentTime,
          type: 'add-command',
          lineIndex: buffer.length - 1,
          prompt: seq.prompt ?? terminal.prompt,
          command: seq.content,
          typingDuration: typingDur,
        });
      }

      currentTime += typingDur;
    } else {
      // output — skip completely empty output sequences
      if (!seq.content) {
        currentTime += seq.pause ?? anim.defaultSequencePause;
        continue;
      }
      const lines = seq.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const baseTime = currentTime + (i * anim.outputLineStagger);
        buffer.push({ type: 'output' });

        if (buffer.length - bufferStart > maxVisibleLines) {
          frames.push({
            time: baseTime,
            type: 'scroll',
            scrollLines: 1,
            bufferStart: ++bufferStart,
          });
          frames.push({
            time: baseTime + scrollDuration + anim.scrollDelay,
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
      currentTime += lines.length * anim.outputLineStagger + anim.outputEndPause;
    }

    currentTime += seq.pause ?? anim.defaultSequencePause;
  }

  frames.push({ time: currentTime, type: 'final' });
  return { frames, totalDuration: currentTime };
}

// ============================================================================
// SVG rendering helpers
// ============================================================================

function renderWindow(window: WindowConfig, theme: Theme): string {
  const radius = window.style === 'none' ? 0 : window.borderRadius;
  return `
    <rect x="0" y="0" width="${window.width}" height="${window.height}"
          rx="${radius}" ry="${radius}"
          fill="${theme.colors.background}"/>`;
}

function renderTitleBar(
  window: WindowConfig,
  terminal: TerminalTextConfig,
  theme: Theme,
  chrome: ChromeConfig,
): string {
  const { buttonRadius: r, buttonSpacing: s, buttonY: y, titleFontSize } = chrome;
  return `
    <rect x="0" y="0" width="${window.width}" height="${window.titleBarHeight}"
          rx="${window.borderRadius}" ry="${window.borderRadius}"
          fill="${theme.colors.titleBarBackground}"/>
    <rect x="0" y="${y}" width="${window.width}" height="${y}"
          fill="${theme.colors.titleBarBackground}"/>
    <g id="window-controls">
      <circle cx="${terminal.padding + 2}" cy="${y}" r="${r}" fill="${theme.buttons.close}"/>
      <circle cx="${terminal.padding + 2 + s}" cy="${y}" r="${r}" fill="${theme.buttons.minimize}"/>
      <circle cx="${terminal.padding + 2 + s * 2}" cy="${y}" r="${r}" fill="${theme.buttons.maximize}"/>
    </g>
    <text x="${window.width / 2}" y="${y + 5}"
          font-family="${terminal.fontFamily}" font-size="${titleFontSize}"
          fill="${theme.colors.titleBarText}" text-anchor="middle">
      ${escapeXml(window.title)}
    </text>`;
}

function renderTerminalContent(
  window: WindowConfig,
  terminal: TerminalTextConfig,
  theme: Theme,
  effects: EffectsConfig,
  chrome: ChromeConfig,
  animation: AnimationConfig,
  frames: AnimationFrame[],
  lineHeight: number,
): string {
  const titleBarHeight = getTitleBarHeight(window);
  const contentY = titleBarHeight + terminal.paddingTop;
  const viewportHeight = window.height - titleBarHeight;

  const scrollAnimations = renderScrollAnimations(frames, terminal, lineHeight);
  const allLines = generateAllLines(frames, terminal, lineHeight, theme.colors, effects.textGlow, chrome, animation);

  return `
    <defs>
      <clipPath id="terminalViewport">
        <rect x="0" y="${titleBarHeight}" width="${window.width}" height="${viewportHeight}"/>
      </clipPath>
    </defs>
    <rect x="0" y="${titleBarHeight}" width="${window.width}"
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
          begin="${frame.time}ms" dur="${SCROLL_ANIM_DURATION}ms" fill="freeze"/>`;
  }).join('');
}

// ============================================================================
// Static SVG generation (no animations)
// ============================================================================

/** Render styled spans for static SVG (no animations). */
function renderStaticStyledText(
  text: string,
  colorMap: Record<string, string>,
  defaultColor: string,
  dimOpacity: number,
): string {
  const spans = parseMarkup(text, colorMap, defaultColor);
  return spans.map(span => {
    const color = span.fg ?? defaultColor;
    const attrs = [`fill="${color}"`];
    if (span.bold) attrs.push('font-weight="bold"');
    if (span.dim) attrs.push(`opacity="${dimOpacity}"`);
    return `<tspan ${attrs.join(' ')}>${escapeXml(span.text)}</tspan>`;
  }).join('');
}

/** Generate a static (non-animated) SVG terminal showing all content. */
export function generateStaticSvg(lines: string[], config: TerminalConfig): string {
  const { text: terminal, theme, effects, chrome } = config;
  const window = { ...config.window };

  // Auto-height for static: fit all content
  if (window.autoHeight) {
    const lineHeight = terminal.fontSize * terminal.lineHeight;
    const contentHeight = lines.length * lineHeight;
    const titleBarHeight = getTitleBarHeight(window);
    const chromeHeight = titleBarHeight + terminal.paddingTop + terminal.padding * 2;
    const calculated = Math.ceil(contentHeight + chromeHeight);
    window.height = Math.max(window.minHeight, Math.min(window.maxHeight, calculated));
  }

  const lineHeight = terminal.fontSize * terminal.lineHeight;
  const titleBarHeight = getTitleBarHeight(window);
  const contentY = titleBarHeight + terminal.paddingTop;
  const viewportHeight = window.height - titleBarHeight;
  const accessibilityLabel = `Static terminal showing ${lines.length} lines`;
  const colorMap = buildColorMap(theme.colors);
  const filter = effects.textGlow ? ' filter="url(#textGlow)"' : '';
  const showShadow = effects.shadow && window.style !== 'none';

  const lineElements = lines.map((line, i) => {
    const y = roundCoord(i * lineHeight);
    const hasMarkupTags = line.includes('[[');
    const textContent = hasMarkupTags
      ? renderStaticStyledText(line, colorMap, theme.colors.text, chrome.dimOpacity)
      : escapeXml(line);
    const fill = hasMarkupTags ? '' : ` fill="${theme.colors.text}"`;

    return `
      <text y="${y}" font-family="${terminal.fontFamily}" font-size="${terminal.fontSize}"
            ${fill}${filter} xml:space="preserve">
        ${textContent}
      </text>`;
  }).join('');

  return `<svg width="${window.width}" height="${window.height}" xmlns="http://www.w3.org/2000/svg"
  role="img" aria-label="${escapeXml(accessibilityLabel)}">
  <defs>
    ${generateDefs(effects)}
    ${generateFilters(effects)}
  </defs>

  <g${showShadow ? ' filter="url(#shadow)"' : ''}>
    ${renderWindow(window, theme)}
    ${renderTitleBarForStyle(window, terminal, theme, chrome)}
    <defs>
      <clipPath id="terminalViewport">
        <rect x="0" y="${titleBarHeight}" width="${window.width}" height="${viewportHeight}"/>
      </clipPath>
    </defs>
    <rect x="0" y="${titleBarHeight}" width="${window.width}"
          height="${viewportHeight}" fill="${theme.colors.background}"/>
    <g clip-path="url(#terminalViewport)">
      <g transform="translate(${terminal.padding}, ${contentY})">
        ${lineElements}
      </g>
    </g>
  </g>
</svg>`;
}
