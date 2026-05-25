import { describe, it, expect, vi } from 'vitest';
import { generateSvg, generateStaticSvg } from '../svg-generator.js';
import { DEFAULT_CONFIG } from '../defaults.js';
import type { Sequence, TerminalConfig } from '../../types.js';

function makeConfig(overrides: Partial<TerminalConfig> = {}): TerminalConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

const basicSequences: Sequence[] = [
  { type: 'command', content: 'echo hello', typingDuration: 500 },
  { type: 'output', content: 'hello' },
];

describe('generateSvg', () => {
  it('produces valid SVG with role and aria-label', () => {
    const svg = generateSvg(basicSequences, makeConfig());
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label=');
    expect(svg).toContain('</svg>');
  });

  it('includes prefers-reduced-motion media query', () => {
    const svg = generateSvg(basicSequences, makeConfig());
    expect(svg).toContain('prefers-reduced-motion');
  });

  it('includes accessibility label with commands', () => {
    const svg = generateSvg(basicSequences, makeConfig());
    expect(svg).toContain('echo hello');
  });

  it('renders shadow filter when effects.shadow is true', () => {
    const svg = generateSvg(basicSequences, makeConfig());
    expect(svg).toContain('filter="url(#shadow)"');
  });

  it('omits shadow filter when effects.shadow is false', () => {
    const config = makeConfig({
      effects: { ...DEFAULT_CONFIG.effects, shadow: false },
    });
    const svg = generateSvg(basicSequences, config);
    expect(svg).not.toContain('filter="url(#shadow)"');
  });

  // Window style tests
  it('renders title bar for macos style', () => {
    const svg = generateSvg(basicSequences, makeConfig());
    expect(svg).toContain('id="window-controls"');
  });

  it('omits title bar for floating style', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, style: 'floating' },
    });
    const svg = generateSvg(basicSequences, config);
    expect(svg).not.toContain('id="window-controls"');
  });

  it('omits title bar for minimal style', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, style: 'minimal' },
    });
    const svg = generateSvg(basicSequences, config);
    expect(svg).not.toContain('id="window-controls"');
  });

  it('omits title bar and shadow for none style', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, style: 'none' },
    });
    const svg = generateSvg(basicSequences, config);
    expect(svg).not.toContain('id="window-controls"');
    expect(svg).not.toContain('filter="url(#shadow)"');
  });

  it('removes border radius for none style', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, style: 'none' },
    });
    const svg = generateSvg(basicSequences, config);
    expect(svg).toContain('rx="0"');
  });

  // Auto-height tests
  it('uses specified height when autoHeight is false', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, height: 500 },
    });
    const svg = generateSvg(basicSequences, config);
    expect(svg).toContain('height="500"');
  });

  it('auto-calculates height when autoHeight is true', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, autoHeight: true, minHeight: 100, maxHeight: 2000 },
    });
    const svg = generateSvg(basicSequences, config);
    // Should not use the default 700
    expect(svg).not.toContain('height="700"');
  });

  it('clamps auto-height to minHeight', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, autoHeight: true, minHeight: 800, maxHeight: 2000 },
    });
    const svg = generateSvg(basicSequences, config);
    expect(svg).toContain('height="800"');
  });

  it('clamps auto-height to maxHeight', () => {
    // Create many output lines to force a large height
    const manyLines: Sequence[] = [
      { type: 'command', content: 'ls' },
      { type: 'output', content: Array(100).fill('file.txt').join('\n') },
    ];
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, autoHeight: true, minHeight: 100, maxHeight: 500 },
    });
    const svg = generateSvg(manyLines, config);
    expect(svg).toContain('height="500"');
  });

  // Empty sequence handling
  it('handles empty output content without crashing', () => {
    const sequences: Sequence[] = [
      { type: 'command', content: 'echo', typingDuration: 100 },
      { type: 'output', content: '' },
    ];
    const svg = generateSvg(sequences, makeConfig());
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  // maxDuration warning
  it('warns when animation exceeds maxDuration', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const longSequences: Sequence[] = Array.from({ length: 10 }, (_, i) => ([
      { type: 'command' as const, content: `cmd-${i}`, typingDuration: 5000 },
      { type: 'output' as const, content: `output-${i}` },
    ])).flat();
    const config = makeConfig({ maxDuration: 1 }); // 1 second
    generateSvg(longSequences, config);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeds maxDuration'),
    );
    warnSpy.mockRestore();
  });
});

describe('generateStaticSvg', () => {
  const lines = ['user@host:~$ echo hello', 'hello'];

  it('produces valid static SVG', () => {
    const svg = generateStaticSvg(lines, makeConfig());
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('Static terminal showing 2 lines');
    expect(svg).toContain('</svg>');
  });

  it('omits title bar for floating style', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, style: 'floating' },
    });
    const svg = generateStaticSvg(lines, config);
    expect(svg).not.toContain('id="window-controls"');
  });

  it('auto-calculates height for static SVG', () => {
    const config = makeConfig({
      window: { ...DEFAULT_CONFIG.window, autoHeight: true, minHeight: 100, maxHeight: 2000 },
    });
    const svg = generateStaticSvg(lines, config);
    expect(svg).not.toContain('height="700"');
  });
});

describe('prompt + typed-text width pinning', () => {
  // Regression: without textLength, prompt's actual rendered width depends on
  // whichever monospace font the viewer's browser falls back to. If that font's
  // advance is wider than CHAR_WIDTH_RATIO * fontSize, the prompt overlaps the
  // typed text (which is positioned at x=promptWidth). Pinning via textLength +
  // lengthAdjust=spacingAndGlyphs guarantees the rendered geometry matches our
  // internal math regardless of font.
  it('prompt <text> carries textLength = computed promptWidth', () => {
    const seq: Sequence[] = [{ type: 'command', content: 'whoami', typingDuration: 200 }];
    const svg = generateSvg(seq, makeConfig());
    // Prompt text now has class="tt fade-in" + style="animation-delay:..." for
    // reduced-motion compliance (#71); textLength remains for the width pin.
    const promptText = /<text class="tt fade-in" style="animation-delay: \d+ms" fill="[^"]+" textLength="(\d+)" lengthAdjust="spacingAndGlyphs">/.exec(svg);
    expect(promptText).not.toBeNull();
    expect(parseInt(promptText![1]!, 10)).toBeGreaterThan(0);
  });

  it('typed-command <text> carries textLength matching cursor walk math', () => {
    const seq: Sequence[] = [{ type: 'command', content: 'whoami', typingDuration: 200 }];
    const svg = generateSvg(seq, makeConfig());
    // whoami is 6 chars × charWidth=8 (fontSize 14 × 0.6 rounded) = 48
    expect(svg).toContain('textLength="48"');
  });

  it('empty command does not emit textLength (no typed text to pin)', () => {
    const seq: Sequence[] = [{ type: 'command', content: '', typingDuration: 100 }];
    const svg = generateSvg(seq, makeConfig());
    // The prompt still has textLength; the typed-text element wouldn't.
    const matches = svg.match(/textLength=/g) ?? [];
    expect(matches.length).toBe(1); // prompt only
  });
});

describe('SMIL-stripped fallback', () => {
  // Simulates what a non-SMIL renderer (OG scrapers, npm-readme, RSS) sees:
  // strip every <animate>, <animateTransform>, and <set>, then check that
  // the final-frame content is still visible. Before #85, line groups carried
  // opacity="0" and clip rects carried width="0" — stripping SMIL left the
  // terminal blank.
  function stripSmil(svg: string): string {
    return svg
      .replace(/<animate[^>]*\/>/g, '')
      .replace(/<animateTransform[^>]*\/>/g, '')
      .replace(/<set[^>]*\/>/g, '');
  }

  it('line groups have no static opacity="0" — visible without SMIL', () => {
    const seq: Sequence[] = [
      { type: 'command', content: 'echo hi' },
      { type: 'output', content: 'hi' },
    ];
    const svg = generateSvg(seq, makeConfig());
    const stripped = stripSmil(svg);
    // Every <g id="line-N"> in the output should be visible after stripping.
    // Look for the line groups — they used to be `<g id="line-N" ... opacity="0">`.
    expect(stripped).not.toMatch(/<g[^>]*id="line-\d+"[^>]*opacity="0"/);
  });

  it('clip-path rect has static width=final, not width=0', () => {
    // 'whoami' is 6 chars × 8 px = cmdWidth 48. The clip rect's STATIC width
    // attribute should now be 48 (the final reveal width). The reveal animate
    // still steps from 0 — but only when SMIL is honored.
    const seq: Sequence[] = [
      { type: 'output', content: 'hello' },
      { type: 'command', content: 'whoami', typingDuration: 200 },
    ];
    const svg = generateSvg(seq, makeConfig());
    expect(svg).toMatch(/<rect x="\d+" y="-\d+" width="48" height="\d+">/);
    // SMIL viewers see a setHold pinning width to 0 until startTime>0.
    expect(svg).toContain('<set attributeName="width" to="0" begin="0s"');
  });

  it('first sequence command has no setHold (startTime=0 — nothing to hold)', () => {
    const seq: Sequence[] = [{ type: 'command', content: 'whoami', typingDuration: 200 }];
    const svg = generateSvg(seq, makeConfig());
    // Still no opacity="0" on the line group / no width="0" on the clip rect.
    expect(svg).not.toMatch(/<g[^>]*id="line-0"[^>]*opacity="0"/);
    expect(svg).toMatch(/<rect x="\d+" y="-\d+" width="48" height="\d+">/);
  });

  it('prompt text has no static opacity="0" attribute', () => {
    const seq: Sequence[] = [{ type: 'command', content: 'hi' }];
    const svg = generateSvg(seq, makeConfig());
    // The prompt <text> element used to carry opacity="0". Now it's bare so
    // its underlying value is 1 — visible to SMIL-stripping renderers.
    expect(svg).not.toMatch(/<text class="tt" fill="[^"]+" opacity="0" textLength=/);
  });

  it('animated-output line groups also drop opacity="0"; frame 0 stays visible after SMIL strip', () => {
    // Animated frame-cycle output (spinners, heartbeat) renders N <text>
    // siblings at the same y, frame 0 with opacity="1", others "0". The
    // wrapping <g> used to have opacity="0" too — stripping SMIL hid even
    // frame 0. Now the <g> has no opacity attribute, so frame 0 shows.
    const seq: Sequence[] = [
      { type: 'output', content: 'pre' },
      { type: 'output', content: 'spin', frames: [' / ', ' - ', ' \\ ', ' | '], framesFps: 4, framesLoop: true },
    ];
    const svg = generateSvg(seq, makeConfig());
    expect(svg).not.toMatch(/<g[^>]*id="line-1"[^>]*opacity="0"/);
    // Frame 0 still has opacity="1" so it's the static fallback when SMIL is stripped.
    expect(svg).toContain('opacity="1"');
  });
});

describe('<desc> box-drawing elision (partial #91)', () => {
  // Pure box-drawing lines (╔═══╗ / ║ … ║ / ╚═══╝) carry zero semantic value
  // for screen readers AND bloat the <desc> payload. They're elided.
  it('strips lines composed entirely of box-drawing glyphs', () => {
    const seq: Sequence[] = [
      { type: 'output', content: '╔════════════════╗\n║ Hello, world ║\n╚════════════════╝' },
    ];
    const svg = generateSvg(seq, makeConfig());
    const descMatch = /<desc>([^<]+)<\/desc>/.exec(svg);
    expect(descMatch).not.toBeNull();
    const desc = descMatch![1]!;
    expect(desc).toContain('Hello, world');
    // The two box-drawing-only lines (top + bottom) are stripped.
    expect(desc).not.toContain('═');
  });

  it('keeps lines that have content alongside box chars', () => {
    const seq: Sequence[] = [
      // The middle line has ║ AND text — kept verbatim.
      { type: 'output', content: '║ Important content ║' },
    ];
    const svg = generateSvg(seq, makeConfig());
    expect(svg).toContain('Important content');
  });
});

describe('prefers-reduced-motion (CSS fade-ins, #71)', () => {
  // Option 5 from the nexus vote: fade-ins migrated from SMIL <animate> to
  // CSS @keyframes fadeIn. The existing @media (prefers-reduced-motion) block
  // in the SVG <style> automatically clamps these animations to 0.01ms under
  // reduced-motion. Typing reveal, cursor walk, scroll, and frame cycle
  // remain SMIL — those continue to ignore reduced-motion (documented).
  it('emits @keyframes fadeIn and a .fade-in class rule', () => {
    const seq: Sequence[] = [{ type: 'command', content: 'hi' }];
    const svg = generateSvg(seq, makeConfig());
    expect(svg).toContain('@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }');
    expect(svg).toContain('.fade-in { animation: fadeIn');
  });

  it('emits @media (prefers-reduced-motion) block that clamps animation-duration', () => {
    const seq: Sequence[] = [{ type: 'command', content: 'hi' }];
    const svg = generateSvg(seq, makeConfig());
    expect(svg).toContain('@media (prefers-reduced-motion: reduce)');
    expect(svg).toContain('animation-duration: 0.01ms !important');
  });

  it('prompt + output lines + animated wrappers carry class="fade-in" with per-element animation-delay', () => {
    const seq: Sequence[] = [
      { type: 'command', content: 'hi' },
      { type: 'output', content: 'world' },
      { type: 'output', content: 'spin', frames: ['/', '-', '\\', '|'], framesFps: 4, framesLoop: true },
    ];
    const svg = generateSvg(seq, makeConfig());
    // At least 3 fade-in elements: prompt text, output line group, animated group.
    const matches = svg.match(/class="[^"]*fade-in[^"]*"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
    // Each carries animation-delay (some are 0ms — for the first sequence).
    const delayMatches = svg.match(/style="animation-delay: \d+ms"/g) ?? [];
    expect(delayMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('replaces SMIL opacity animates with CSS for output line groups', () => {
    const seq: Sequence[] = [
      { type: 'output', content: 'pre' },
      { type: 'output', content: 'post' },
    ];
    const svg = generateSvg(seq, makeConfig());
    // No <animate attributeName="opacity"> on output line groups anymore (the
    // animated-frame-cycle inner <text> still uses SMIL for its frame cycle —
    // that's the documented remaining SMIL surface; this test has no animated
    // frames so should be zero opacity animates).
    expect(svg).not.toMatch(/<animate attributeName="opacity"/);
  });
});

describe('scroll consolidation', () => {
  // Before: N per-scroll <animateTransform> elements. After: 1 with values +
  // keyTimes spanning the full timeline. Verifies the consolidation actually
  // emits exactly 1 animateTransform regardless of scroll count.
  it('emits exactly 1 animateTransform regardless of scroll count', () => {
    const seq: Sequence[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'output' as const,
      content: `line ${i}`,
    }));
    const cfg = {
      ...makeConfig(),
      window: { ...makeConfig().window, height: 200, autoHeight: false },
    };
    const svg = generateSvg(seq, cfg);
    const matches = svg.match(/<animateTransform/g) ?? [];
    expect(matches.length).toBe(1);
    expect(svg).toContain('values="');
    expect(svg).toContain('keyTimes="');
  });
});

describe('line-position rounding', () => {
  // Default lineHeight = 14 × 1.8 = 25.2. Old roundCoord(i × 25.2) produced
  // gap pattern 25,25,26,25,25 — a +1 px jog every 5th row, visible on dense
  // neofetch output. Now we emit fractional y (toFixed(1)) so gaps are
  // uniformly 25.2.
  it('emits fractional y for evenly-spaced rows', () => {
    const seq: Sequence[] = [
      { type: 'output', content: 'l0' },
      { type: 'output', content: 'l1' },
      { type: 'output', content: 'l2' },
      { type: 'output', content: 'l3' },
      { type: 'output', content: 'l4' },
    ];
    const svg = generateSvg(seq, makeConfig());
    const ys = [...svg.matchAll(/<g[^>]*id="line-(\d+)"[^>]*translate\(0, ([\d.]+)\)/g)]
      .map(m => +m[2]!);
    expect(ys).toEqual([0, 25.2, 50.4, 75.6, 100.8]);
  });
});

describe('cursor positioning edge cases', () => {
  it('single-character command — cursor stays at column 0 (values[0] === values[1])', () => {
    const seq: Sequence[] = [{ type: 'command', content: 'a', typingDuration: 100 }];
    const svg = generateSvg(seq, makeConfig());
    const match = /<animate attributeName="x" values="([^"]+)"/.exec(svg);
    expect(match).not.toBeNull();
    const vals = match![1]!.split(';');
    expect(vals).toHaveLength(2); // charCount=1 → values length = N+1 = 2
    expect(vals[0]).toBe(vals[1]);
  });

  it('empty command — emits no cursor walk animate at all', () => {
    const seq: Sequence[] = [{ type: 'command', content: '', typingDuration: 100 }];
    const svg = generateSvg(seq, makeConfig());
    expect(svg).not.toMatch(/<animate attributeName="x"/);
  });
});

describe('cursor positioning (lag-by-one + no blink during typing)', () => {
  // Locks the fix from the cursor-animation bug report. Two specific shapes:
  //   1. cursor x values lag by one column — values[0]=values[1]=col0,
  //      values[k>=1]=col(k-1). Cursor sits ON the most-recently emerged char,
  //      not after it.
  //   2. cursor blink (values="1;1;0;0") is gone during typing so the cursor
  //      is never invisible while characters appear.
  const seq: Sequence[] = [
    { type: 'command', content: 'echo hi', typingDuration: 200 },
    { type: 'output', content: 'hi' },
    { type: 'command', content: 'whoami', typingDuration: 200 },
    { type: 'output', content: 'dev' },
  ];

  it('cursor x values lag the char-reveal clip widths by one column', () => {
    const svg = generateSvg(seq, makeConfig());
    // Cursor walk + clip width animate share the same keyTimes structure.
    // After fix: cursor values[0] === values[1] (both at column 0); thereafter
    // cursor[k] = clipWidth[k-1] + promptStartX.
    const cursorAnimate = /<animate attributeName="x" values="([^"]+)"/g;
    const matches = [...svg.matchAll(cursorAnimate)];
    expect(matches.length).toBeGreaterThanOrEqual(2); // one per command line
    for (const m of matches) {
      const vals = m[1]!.split(';');
      expect(vals[0]).toBe(vals[1]); // lag-by-one: first two values equal
    }
  });

  it('cursor has no blink animate during typing', () => {
    const svg = generateSvg(seq, makeConfig());
    // The pre-fix blink pattern is "values=\"1;1;0;0\"" — should be gone now.
    expect(svg).not.toMatch(/values="1;1;0;0"/);
  });

  it('cursor still fades in at start + fades out at typing end on every line', () => {
    const svg = generateSvg(seq, makeConfig());
    // Two command lines × (fade-in + fade-out) = 4 opacity animates that aren't part
    // of the prompt/output fade-ins. Loose floor: at least 4 cursor-opacity animates.
    const cursorOpacity = svg.match(/<animate attributeName="opacity" (?:from|to)="\d"/g) ?? [];
    expect(cursorOpacity.length).toBeGreaterThanOrEqual(4);
  });
});

describe('output element-count budget', () => {
  // Regression net for issue #63 — per-character tspans + per-character
  // cursor animates were consolidated into one clipPath + one cursor walk.
  // If these counts regress, someone re-introduced per-char animates.
  it('keeps animate elements bounded on a representative 5-line config', () => {
    const seq: Sequence[] = [];
    for (let i = 0; i < 5; i++) {
      seq.push({ type: 'command', content: `echo "hello ${i}"`, typingDuration: 500 });
      seq.push({ type: 'output', content: `hello ${i}` });
    }
    const svg = generateSvg(seq, makeConfig());
    const animateCount = (svg.match(/<animate /g) ?? []).length;
    // Pre-#63: ~80 animates (per-char + per-char cursor + frames).
    // Post-#63: well under 40 for this fixture. Tight ceiling to catch regression.
    expect(animateCount).toBeLessThan(40);
    // Per-tspan-with-animate pattern should be entirely gone.
    expect(svg).not.toMatch(/<tspan opacity="0">/);
  });
});

describe('animated output (frame-cycle)', () => {
  const animSeq: Sequence[] = [
    { type: 'command', content: 'spin', typingDuration: 100 },
    {
      type: 'output',
      content: 'A',
      frames: ['A', 'B', 'C'],
      framesFps: 3,
      framesLoop: true,
    },
  ];

  it('emits one <text> per frame with discrete opacity animation', () => {
    const svg = generateSvg(animSeq, makeConfig());
    // 3 frame-opacity animates + 1 cursor walk + 1 char-reveal clipPath = 5
    const animateCount = (svg.match(/calcMode="discrete"/g) ?? []).length;
    expect(animateCount).toBe(5);
  });

  it('cycle duration equals frames/fps seconds', () => {
    const svg = generateSvg(animSeq, makeConfig());
    expect(svg).toContain('dur="1.000s"'); // 3 frames / 3 fps
  });

  it('uses indefinite repeat when framesLoop is true', () => {
    const svg = generateSvg(animSeq, makeConfig());
    expect(svg).toContain('repeatCount="indefinite"');
    expect(svg).toContain('dur="1.000s"');
  });

  it('emits repeatCount=1 when framesLoop is false', () => {
    const seq: Sequence[] = [{
      type: 'output',
      content: 'A',
      frames: ['A', 'B'],
      framesFps: 2,
      framesLoop: false,
    }];
    const svg = generateSvg(seq, makeConfig());
    expect(svg).toContain('repeatCount="1"');
    expect(svg).toContain('dur="1.000s"');
  });

  it('first frame is also the static fallback line', () => {
    const svg = generateSvg(animSeq, makeConfig());
    // Frame 0 starts visible (opacity="1"), others hidden (opacity="0")
    expect(svg).toMatch(/<text class="tt"[^>]*opacity="1">A/);
    expect(svg).toMatch(/<text class="tt"[^>]*opacity="0">B/);
    expect(svg).toMatch(/<text class="tt"[^>]*opacity="0">C/);
  });
});

describe('accessibility', () => {
  const a11ySeq: Sequence[] = [
    { type: 'command', content: 'whoami', typingDuration: 200 },
    { type: 'output', content: 'dev' },
    { type: 'output', content: '[[fg:green]]hi[[/fg]]' },
  ];

  it('emits <title> + <desc> as first children of the SVG', () => {
    const svg = generateSvg(a11ySeq, makeConfig());
    const titleIdx = svg.indexOf('<title>');
    const descIdx = svg.indexOf('<desc>');
    const defsIdx = svg.indexOf('<defs>');
    expect(titleIdx).toBeGreaterThan(0);
    expect(descIdx).toBeGreaterThan(titleIdx);
    expect(defsIdx).toBeGreaterThan(descIdx);
  });

  it('<desc> includes commands with prompt prefix and strips markup from output', () => {
    const svg = generateSvg(a11ySeq, makeConfig());
    const descMatch = /<desc>([\s\S]*?)<\/desc>/.exec(svg);
    expect(descMatch).not.toBeNull();
    const desc = descMatch![1]!;
    expect(desc).toContain('whoami');
    expect(desc).toContain('dev');
    expect(desc).toContain('hi');
    expect(desc).not.toContain('[[fg:');
  });

  it('omits <desc> when accessibility.describe is false (keeps <title>)', () => {
    const config = makeConfig({ accessibility: { describe: false } });
    const svg = generateSvg(a11ySeq, config);
    expect(svg).toContain('<title>');
    expect(svg).not.toContain('<desc>');
  });

  it('XML-escapes special characters in <desc> content', () => {
    const seq: Sequence[] = [
      { type: 'command', content: 'echo "<script>"', typingDuration: 100 },
      { type: 'output', content: 'a & b < c > d' },
    ];
    const svg = generateSvg(seq, makeConfig());
    const desc = /<desc>([\s\S]*?)<\/desc>/.exec(svg)![1]!;
    expect(desc).toContain('&amp;');
    expect(desc).toContain('&lt;');
    expect(desc).not.toContain('<script>');
  });

  it('static SVG also emits <title> + <desc>', () => {
    const svg = generateStaticSvg(['hello', '[[fg:cyan]]world[[/fg]]'], makeConfig());
    expect(svg).toContain('<title>');
    expect(svg).toContain('<desc>');
    const desc = /<desc>([\s\S]*?)<\/desc>/.exec(svg)![1]!;
    expect(desc).toContain('hello');
    expect(desc).toContain('world');
    expect(desc).not.toContain('[[fg:');
  });
});

// ---------------------------------------------------------------------------
// Snapshot tests — guard against accidental visual regressions in CI.
// If output changes intentionally: `npm test -- -u` to refresh.
// ---------------------------------------------------------------------------
describe('SVG snapshots', () => {
  const snapshotSeq: Sequence[] = [
    { type: 'command', content: 'whoami', typingDuration: 200 },
    { type: 'output', content: 'dev' },
    { type: 'command', content: 'echo hi', typingDuration: 200 },
    { type: 'output', content: '[[fg:green]]hi[[/fg]]' },
  ];

  it('macOS chrome + default effects', () => {
    expect(generateSvg(snapshotSeq, makeConfig())).toMatchSnapshot();
  });

  it('floating window (no chrome)', () => {
    const config = makeConfig({ window: { ...DEFAULT_CONFIG.window, style: 'floating' } });
    expect(generateSvg(snapshotSeq, config)).toMatchSnapshot();
  });

  it('scanlines off + glow on', () => {
    const config = makeConfig({ effects: { ...DEFAULT_CONFIG.effects, scanlines: false, textGlow: true } });
    expect(generateSvg(snapshotSeq, config)).toMatchSnapshot();
  });

  it('static SVG with markup', () => {
    expect(generateStaticSvg(['hello', '[[fg:cyan]]world[[/fg]]'], makeConfig())).toMatchSnapshot();
  });
});
