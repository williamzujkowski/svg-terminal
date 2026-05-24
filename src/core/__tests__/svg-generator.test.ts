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
