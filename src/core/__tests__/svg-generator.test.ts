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
