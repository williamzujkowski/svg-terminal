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
    // 3 frame-opacity animates + 1 cursor-walk animate = 4 total
    const animateCount = (svg.match(/calcMode="discrete"/g) ?? []).length;
    expect(animateCount).toBe(4);
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
