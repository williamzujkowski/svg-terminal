/**
 * SVG Terminal Generator — creates animated SVG terminals from sequences.
 * This is the core rendering engine: sequences in, SVG string out.
 */

import type {
  AccessibilityConfig,
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
import { buildColorMap, parseMarkup, stripMarkup } from './markup-parser.js';
import { escapeXml, roundCoord } from './xml.js';
import { SCROLL_ANIM_DURATION } from './defaults.js';
import { isStrict } from './strict-mode.js';

// ============================================================================
// Auto-height calculation
// ============================================================================

/** Vertical rows an animated sequence occupies = the TALLEST frame. Frames
 *  overlap in time (only one is visible per cycle slot), so the block's height
 *  is max(frame rows), never the sum. Ragged frames pad up to this. #69. */
function animationHeight(frames: string[][]): number {
  return Math.max(1, ...frames.map(f => f.length));
}

/** Count total output lines from sequences (commands + output lines). */
function countTotalLines(sequences: Sequence[]): number {
  let total = 0;
  for (const seq of sequences) {
    if (seq.type === 'command') {
      total += 1;
    } else if (seq.frames && seq.frames.length > 0) {
      // Animated output occupies the tallest frame's row count, not its
      // (frame-0) content line count — ragged frames could be taller. #69.
      total += animationHeight(seq.frames);
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
  // #97: user-provided accessibilityLabel wins. Auto-generated command
  // summary is the fallback when nothing is configured.
  const accessibilityLabel = config.accessibilityLabel ?? buildAccessibilityLabel(sequences);
  const showShadow = effects.shadow && window.style !== 'none';
  const a11yChildren = renderAccessibilityChildren(accessibilityLabel, sequences, terminal.prompt, config.accessibility);

  // Collect unique frame counts (N) across all animated-block sequences for
  // the per-N @keyframes emission below. Each N needs its own keyframes rule
  // because the "visible window" portion is 100/N % of the cycle. Decision
  // tree: nexus vote 100% approved Option D over C — see #69 ship notes.
  const frameCounts = new Set<number>();
  for (const seq of sequences) {
    if (seq.type === 'output' && seq.frames && seq.frames.length > 1) {
      frameCounts.add(seq.frames.length);
    }
  }
  const frameCycleKeyframes = [...frameCounts].sort((a, b) => a - b).map(n => {
    // For N frames, each is visible during [0, 100/N)% of its own cycle (its
    // delay phase shifts the cycle's start). At keyTime 100/N, opacity drops
    // to 0; stays 0 until 100% (next cycle starts). The 0.01% step gives
    // discrete (non-interpolated) switching.
    const slot = (100 / n).toFixed(4);
    return `    @keyframes frame-cycle-${n} { 0%, ${slot}% { opacity: 1; } ${(parseFloat(slot) + 0.01).toFixed(4)}%, 100% { opacity: 0; } }`;
  }).join('\n');

  return `<svg width="${window.width}" height="${window.height}" viewBox="0 0 ${window.width} ${window.height}" xmlns="http://www.w3.org/2000/svg"
  role="img" aria-label="${escapeXml(accessibilityLabel)}">${a11yChildren}
  <style>
    .tt { font-family: ${escapeXml(terminal.fontFamily)}; font-size: ${terminal.fontSize}px; white-space: pre; }
    @keyframes scanlineScroll {
      from { transform: translateY(0); }
      to { transform: translateY(4px); }
    }
    .scanline-overlay { animation: scanlineScroll 1.2s linear infinite; }
    /* fadeIn drives all opacity fade-ins (prompt + output lines + animated frame
       wrappers). Lives in CSS rather than SMIL so the @media block below kills
       it under prefers-reduced-motion. fill-mode: backwards keeps the element
       at opacity 0 during the animation-delay window so it doesn't pop in
       before its scheduled time. */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .fade-in { animation: fadeIn 10ms linear backwards; }
    /* frame-cycle-N (closes #69): one rule per unique frame count across the
       animated blocks in this render. Each frame text element carries the
       class + an inline animation-delay = i*frameDur. The static opacity
       attribute (frame 0 = 1, others = 0) is the SMIL-stripped AND
       reduced-motion fallback — frame 0 visible, rest invisible. Under
       prefers-reduced-motion the @media block kills animation-duration so
       the underlying opacity attribute applies. */
${frameCycleKeyframes}
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
  <defs>
    ${generateDefs(effects, window.style)}
    ${generateFilters(effects, theme.colors.cursor)}
    <clipPath id="terminalViewport">
      <rect x="0" y="${getTitleBarHeight(window)}" width="${window.width}" height="${window.height - getTitleBarHeight(window)}"/>
    </clipPath>
  </defs>

  <g${showShadow ? ' filter="url(#shadow)"' : ''}>
    ${renderWindow(window, theme)}
    ${renderTitleBarForStyle(window, terminal, theme, chrome)}
    ${renderTerminalContent(window, terminal, theme, effects, chrome, animation, frames, lineHeight)}
    ${renderVignetteOverlay(effects, window)}
    ${renderScanlineOverlay(effects, window)}
  </g>
</svg>`;
}

/** Render the CRT-vignette overlay over the terminal content area. Order:
 *  vignette UNDER scanlines so the scanline pattern still reads at the edges. */
function renderVignetteOverlay(effects: EffectsConfig, window: WindowConfig): string {
  if (!effects.vignette) return '';
  const titleBarHeight = getTitleBarHeight(window);
  const contentHeight = window.height - titleBarHeight;
  return `<rect x="0" y="${titleBarHeight}" width="${window.width}" height="${contentHeight}" fill="url(#vignette)" pointer-events="none"/>`;
}

/** Render the CRT scanline overlay constrained to the terminal content area. */
function renderScanlineOverlay(effects: EffectsConfig, window: WindowConfig, animated = true): string {
  if (!effects.scanlines) return '';
  const titleBarHeight = getTitleBarHeight(window);
  const contentHeight = window.height - titleBarHeight;
  // The `scanline-overlay` class drives a CSS @keyframes scroll. The static
  // path has no animation, so the class would be a dead reference — omit it
  // to keep the static markup honest.
  const classAttr = animated ? ' class="scanline-overlay"' : '';
  return `<rect x="0" y="${titleBarHeight}" width="${window.width}" height="${contentHeight}" fill="url(#scanlines)" pointer-events="none" opacity="0.5"${classAttr}/>`;
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

/**
 * Render <title> + <desc> as the first children of the SVG.
 * <title> matches the aria-label (short summary).
 * <desc> carries the full final-frame content — commands prefixed with the
 * prompt, output lines as-is, color markup stripped — so screen readers can
 * read the terminal's content beyond the 5-command summary.
 *
 * Returns just <title> (no <desc>) when accessibility.describe is false.
 */
function renderAccessibilityChildren(
  label: string,
  sequences: Sequence[],
  prompt: string,
  a11y: AccessibilityConfig,
): string {
  const title = `\n  <title>${escapeXml(label)}</title>`;
  if (!a11y.describe) return title;

  const lines: string[] = [];
  for (const seq of sequences) {
    if (seq.type === 'command') {
      lines.push(`${prompt}${seq.content}`);
    } else if (seq.content) {
      for (const line of seq.content.split('\n')) {
        const stripped = stripMarkup(line);
        if (isBoxDrawingOnly(stripped)) continue;
        lines.push(stripBoxFraming(stripped));
      }
    }
  }
  if (lines.length === 0) return title;
  return `${title}\n  <desc>${escapeXml(lines.join('\n'))}</desc>`;
}

/**
 * True if the line is composed entirely of Unicode box-drawing glyphs
 * (U+2500–U+257F) plus whitespace. Those lines are pure visual frames
 * for ASCII boxes — they carry zero semantic content for a screen reader
 * AND inflate the <desc> payload (~600 bytes per box × 8 gallery files).
 */
function isBoxDrawingOnly(line: string): boolean {
  if (line.length === 0) return false;
  return /^[─-╿\s]+$/.test(line);
}

/**
 * Strip leading/trailing box-drawing characters + whitespace from a content
 * line. Mixed lines like `║ Hello, world ║` keep the content (`"Hello, world"`)
 * but lose the box framing — screen readers no longer pronounce `║` as the
 * letter "L" or skip it inconsistently. Single visual frames are already
 * eliminated by `isBoxDrawingOnly`; this handles the content rows.
 * Closes #91 (full coverage).
 */
function stripBoxFraming(line: string): string {
  return line.replace(/^[─-╿\s]+|[─-╿\s]+$/g, '');
}

/** Render <title> + <desc> for the static SVG path from pre-flattened lines. */
function renderStaticAccessibilityChildren(
  label: string,
  lines: string[],
  a11y: AccessibilityConfig,
): string {
  const title = `\n  <title>${escapeXml(label)}</title>`;
  if (!a11y.describe || lines.length === 0) return title;
  const stripped = lines
    .map(stripMarkup)
    .filter(line => !isBoxDrawingOnly(line))
    .map(stripBoxFraming)
    .join('\n');
  if (stripped.length === 0) return title;
  return `${title}\n  <desc>${escapeXml(stripped)}</desc>`;
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
function renderWin95TitleBar(window: WindowConfig): string {
  const h = window.titleBarHeight;
  const w = window.width;
  const silver = '#c0c0c0';
  const darkGray = '#808080';
  const white = '#ffffff';
  const black = '#000000';
  // Authentic Win95 caption is a horizontal navy → lighter-blue gradient.
  // The gradient def is emitted once per SVG via win95Caption id.
  // Authentic Win95 caption buttons were 16×14, NOT square. Width = h-6
  // (16 for default 22px title bar); height ≈ width × 14/16 = 0.875×.
  const btnW = Math.max(12, h - 6);
  const btnH = Math.round(btnW * 14 / 16);
  const btnY = (h - btnH) / 2;
  const btnGap = 2;
  const btnsTotal = btnW * 3 + btnGap * 2;
  const btnsX = w - btnsTotal - 4;
  const captionTextY = (h + 11) / 2;

  return `
    <!-- Win95 title bar -->
    <rect x="0" y="0" width="${w}" height="${h}" fill="${silver}"/>
    <!-- 3D raised border: top/left white, bottom/right dark -->
    <line x1="0" y1="0" x2="${w}" y2="0" stroke="${white}" stroke-width="2"/>
    <line x1="0" y1="0" x2="0" y2="${h}" stroke="${white}" stroke-width="2"/>
    <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="${black}" stroke-width="1"/>
    <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="${darkGray}" stroke-width="1"/>
    <!-- Blue caption (gradient defined in defs) -->
    <rect x="3" y="3" width="${w - 6 - btnsTotal - 6}" height="${h - 6}" fill="url(#win95Caption)"/>
    <!-- Caption text — sans-serif chrome font, not the terminal monospace -->
    <text x="8" y="${captionTextY}"
          font-family="Tahoma, 'MS Sans Serif', Geneva, sans-serif" font-size="11" font-weight="bold"
          fill="${white}">
      ${escapeXml(window.title)}
    </text>
    <!-- Win95 buttons: minimize, maximize, close -->
    <g transform="translate(${btnsX}, ${btnY})">
      <rect x="0" y="0" width="${btnW}" height="${btnH}" fill="${silver}" stroke="${black}" stroke-width="1"/>
      <line x1="${btnW * 0.2}" y1="${btnH - 3}" x2="${btnW * 0.75}" y2="${btnH - 3}" stroke="${black}" stroke-width="1.5"/>
      <rect x="${btnW + btnGap}" y="0" width="${btnW}" height="${btnH}" fill="${silver}" stroke="${black}" stroke-width="1"/>
      <rect x="${btnW + btnGap + 3}" y="3" width="${btnW - 6}" height="${btnH - 6}" fill="none" stroke="${black}" stroke-width="1.2"/>
      <rect x="${(btnW + btnGap) * 2}" y="0" width="${btnW}" height="${btnH}" fill="${silver}" stroke="${black}" stroke-width="1"/>
      <line x1="${(btnW + btnGap) * 2 + 3}" y1="3" x2="${(btnW + btnGap) * 2 + btnW - 3}" y2="${btnH - 3}" stroke="${black}" stroke-width="1.2"/>
      <line x1="${(btnW + btnGap) * 2 + btnW - 3}" y1="3" x2="${(btnW + btnGap) * 2 + 3}" y2="${btnH - 3}" stroke="${black}" stroke-width="1.2"/>
    </g>`;
}

function renderTitleBarForStyle(
  window: WindowConfig,
  terminal: TerminalTextConfig,
  theme: Theme,
  chrome: ChromeConfig,
): string {
  if (window.style === 'none' || window.style === 'floating' || window.style === 'minimal') {
    return '';
  }
  if (window.style === 'win95') {
    return renderWin95TitleBar(window);
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

      // Animated output: reserve H = tallest-frame rows in the buffer so
      // auto-height, scroll geometry, and subsequent line y-positions account
      // for the block's full height (#69 multi-line). lineIndex is the TOP row;
      // the renderer draws each row downward from there. One add-output frame
      // carries the whole frames payload.
      if (seq.frames && seq.frames.length > 0) {
        const height = animationHeight(seq.frames);
        // #124: an animated band taller than the visible area overflows the
        // viewport clipPath and is silently clipped (autoHeight — the default —
        // avoids this by sizing to fit; only a too-small FIXED height or an
        // autoHeight maxHeight clamp reaches here). Warn, or hard-error under
        // --strict. Message is numbers-only — no untrusted content interpolated.
        if (height > maxVisibleLines) {
          const msg = `[svg-terminal] An animated block is ${height} rows tall but only ${maxVisibleLines} row(s) fit the terminal — the overflow is clipped. Use window.autoHeight (default) or a taller window.height / maxHeight. (#124)`;
          if (isStrict()) throw new Error(msg);
          console.warn(msg);
        }
        for (let r = 0; r < height; r++) buffer.push({ type: 'output' });
        frames.push({
          time: currentTime,
          type: 'add-output',
          lineIndex: buffer.length - height, // top row of the reserved band
          content: seq.frames[0]!.join('\n'), // frame 0 acts as the static fallback
          color: seq.color,
          frames: seq.frames,
          framesFps: seq.framesFps,
          framesLoop: seq.framesLoop,
          pinWidth: seq.pinWidth,
        });
        currentTime += anim.outputEndPause;
      } else {
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
              pinWidth: seq.pinWidth,
            });
          } else {
            frames.push({
              time: baseTime,
              type: 'add-output',
              lineIndex: buffer.length - 1,
              content: lines[i],
              color: seq.color,
              pinWidth: seq.pinWidth,
            });
          }
        }
        currentTime += lines.length * anim.outputLineStagger + anim.outputEndPause;
      }
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
  const isSquare = window.style === 'none' || window.style === 'win95';
  const radius = isSquare ? 0 : window.borderRadius;
  const bg = `
    <rect x="0" y="0" width="${window.width}" height="${window.height}"
          rx="${radius}" ry="${radius}"
          fill="${escapeXml(theme.colors.background)}"/>`;

  if (window.style === 'win95') {
    // Win95 3D raised border
    const w = window.width;
    const h = window.height;
    return `${bg}
    <line x1="0" y1="0" x2="${w}" y2="0" stroke="#ffffff" stroke-width="2"/>
    <line x1="0" y1="0" x2="0" y2="${h}" stroke="#ffffff" stroke-width="2"/>
    <line x1="${w - 1}" y1="0" x2="${w - 1}" y2="${h}" stroke="#000000" stroke-width="2"/>
    <line x1="0" y1="${h - 1}" x2="${w}" y2="${h - 1}" stroke="#000000" stroke-width="2"/>
    <line x1="1" y1="${h - 2}" x2="${w - 1}" y2="${h - 2}" stroke="#808080" stroke-width="1"/>
    <line x1="${w - 2}" y1="1" x2="${w - 2}" y2="${h - 1}" stroke="#808080" stroke-width="1"/>`;
  }

  return bg;
}

function renderTitleBar(
  window: WindowConfig,
  terminal: TerminalTextConfig,
  theme: Theme,
  chrome: ChromeConfig,
): string {
  const { buttonRadius: r, buttonSpacing: s, buttonY: y, titleFontSize, titleFontFamily } = chrome;
  return `
    <rect x="0" y="0" width="${window.width}" height="${window.titleBarHeight}"
          rx="${window.borderRadius}" ry="${window.borderRadius}"
          fill="${escapeXml(theme.colors.titleBarBackground)}"/>
    <rect x="0" y="${y}" width="${window.width}" height="${y}"
          fill="${escapeXml(theme.colors.titleBarBackground)}"/>
    <g id="window-controls">
      <circle cx="${terminal.padding + 2}" cy="${y}" r="${r}" fill="${escapeXml(theme.buttons.close)}" stroke="rgba(0,0,0,0.18)" stroke-width="0.5"/>
      <circle cx="${terminal.padding + 2 + s}" cy="${y}" r="${r}" fill="${escapeXml(theme.buttons.minimize)}" stroke="rgba(0,0,0,0.18)" stroke-width="0.5"/>
      <circle cx="${terminal.padding + 2 + s * 2}" cy="${y}" r="${r}" fill="${escapeXml(theme.buttons.maximize)}" stroke="rgba(0,0,0,0.18)" stroke-width="0.5"/>
    </g>
    <text x="${window.width / 2}" y="${(window.titleBarHeight + titleFontSize * 0.7) / 2}"
          font-family="${escapeXml(titleFontFamily)}" font-size="${titleFontSize}"
          fill="${escapeXml(theme.colors.titleBarText)}" text-anchor="middle">
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

  const scrollAnimations = renderScrollAnimations(frames, terminal, window, lineHeight);
  const allLines = generateAllLines(frames, terminal, lineHeight, theme.colors, chrome, animation);
  const glow = effects.textGlow ? ' filter="url(#textGlow)"' : '';

  // viewport clipPath was previously emitted in a second <defs> here; it now
  // lives in the top-level <defs> emitted by generateSvg, so only one defs
  // block sits at the SVG root.
  return `
    <rect x="0" y="${titleBarHeight}" width="${window.width}"
          height="${viewportHeight}" fill="${escapeXml(theme.colors.background)}"/>
    <g clip-path="url(#terminalViewport)">
      <g id="scrollContainer" transform="translate(${terminal.padding}, ${contentY})"${glow}>
        ${scrollAnimations}
        ${allLines}
      </g>
    </g>`;
}

function renderScrollAnimations(
  frames: AnimationFrame[],
  terminal: TerminalTextConfig,
  window: WindowConfig,
  lineHeight: number,
): string {
  const scrollFrames = frames.filter(f => f.type === 'scroll');
  if (scrollFrames.length === 0) return '';

  const roundedLineHeight = roundCoord(lineHeight);
  // Must match the initial scrollContainer transform in renderTerminalContent —
  // any mismatch causes a visible jump on the first scroll.
  const titleBarHeight = getTitleBarHeight(window);
  const scrollOriginY = titleBarHeight + terminal.paddingTop;

  // Consolidate N per-scroll animateTransforms into one — closes #70. The
  // values list is paired holds: [origin, origin, y1, y1, y2, y2, …]. Linear
  // interpolation between adjacent equal values means the position holds;
  // interpolation between hold and arrival is the scroll ramp. KeyTimes mark
  // when each hold ends and each arrival completes, normalized to [0, 1] over
  // the total dur. For N scrolls, drops N animate elements to 1; saves
  // ~90 bytes/scroll. Per-scroll begin/dur is encoded in keyTimes; the
  // playback is byte-identical to the previous N-animate form.
  const values: string[] = [`${terminal.padding} ${roundCoord(scrollOriginY)}`];
  const keyTimesMs: number[] = [0];

  let totalScroll = 0;
  for (const frame of scrollFrames) {
    const fromY = roundCoord(scrollOriginY - totalScroll);
    const scrollAmount = (frame.scrollLines ?? 1) * roundedLineHeight;
    totalScroll += scrollAmount;
    const toY = roundCoord(scrollOriginY - totalScroll);
    const startT = frame.time;
    const endT = frame.time + SCROLL_ANIM_DURATION;

    // Hold prev position until startT (skip if no gap from prior keyTime).
    if (keyTimesMs[keyTimesMs.length - 1]! < startT) {
      values.push(`${terminal.padding} ${fromY}`);
      keyTimesMs.push(startT);
    }
    // Ramp to new position by endT.
    values.push(`${terminal.padding} ${toY}`);
    keyTimesMs.push(endT);
  }

  const totalDur = keyTimesMs[keyTimesMs.length - 1]!;
  const keyTimes = keyTimesMs.map(t => (t / totalDur).toFixed(4)).join(';');

  return `
        <animateTransform
          attributeName="transform" type="translate"
          values="${values.join(';')}" keyTimes="${keyTimes}"
          dur="${totalDur}ms" fill="freeze"/>`;
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
    const attrs = [`fill="${escapeXml(color)}"`];
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
  // #97: user-provided accessibilityLabel wins on the static path too.
  const accessibilityLabel = config.accessibilityLabel ?? `Static terminal showing ${lines.length} lines`;
  const a11yChildren = renderStaticAccessibilityChildren(accessibilityLabel, lines, config.accessibility);
  const colorMap = buildColorMap(theme.colors);
  const glow = effects.textGlow ? ' filter="url(#textGlow)"' : '';
  const showShadow = effects.shadow && window.style !== 'none';

  const lineElements = lines.map((line, i) => {
    const y = roundCoord(i * lineHeight);
    const hasMarkupTags = line.includes('[[');
    const textContent = hasMarkupTags
      ? renderStaticStyledText(line, colorMap, theme.colors.text, chrome.dimOpacity)
      : escapeXml(line);
    const fill = hasMarkupTags ? '' : ` fill="${escapeXml(theme.colors.text)}"`;

    return `
      <text class="tt" y="${y}"${fill}>
        ${textContent}
      </text>`;
  }).join('');

  return `<svg width="${window.width}" height="${window.height}" viewBox="0 0 ${window.width} ${window.height}" xmlns="http://www.w3.org/2000/svg"
  role="img" aria-label="${escapeXml(accessibilityLabel)}">${a11yChildren}
  <style>.tt { font-family: ${escapeXml(terminal.fontFamily)}; font-size: ${terminal.fontSize}px; white-space: pre; }</style>
  <defs>
    ${generateDefs(effects, window.style)}
    ${generateFilters(effects, theme.colors.cursor)}
    <clipPath id="terminalViewport">
      <rect x="0" y="${titleBarHeight}" width="${window.width}" height="${viewportHeight}"/>
    </clipPath>
  </defs>

  <g${showShadow ? ' filter="url(#shadow)"' : ''}>
    ${renderWindow(window, theme)}
    ${renderTitleBarForStyle(window, terminal, theme, chrome)}
    <rect x="0" y="${titleBarHeight}" width="${window.width}"
          height="${viewportHeight}" fill="${escapeXml(theme.colors.background)}"/>
    <g clip-path="url(#terminalViewport)">
      <g transform="translate(${terminal.padding}, ${contentY})"${glow}>
        ${lineElements}
      </g>
    </g>
    ${renderVignetteOverlay(effects, window)}
    ${renderScanlineOverlay(effects, window, false)}
  </g>
</svg>`;
}
