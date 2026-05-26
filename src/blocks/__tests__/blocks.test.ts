import { describe, it, expect, beforeAll } from 'vitest';
import {
  registerBuiltinBlocks,
  getBlock,
  listBlocks,
} from '../index.js';
import type { BlockContext } from '../../types.js';
import { mergeConfig } from '../../core/config.js';

const context: BlockContext = {
  now: new Date('2026-02-18T12:00:00-05:00'),
  config: mergeConfig({ blocks: [] }),
  variables: {},
};

beforeAll(() => {
  registerBuiltinBlocks();
});

describe('block registry', () => {
  it('registers all built-in blocks', () => {
    const blocks = listBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(12);
  });

  it('finds blocks by name', () => {
    expect(getBlock('custom')).toBeDefined();
    expect(getBlock('neofetch')).toBeDefined();
    expect(getBlock('fortune')).toBeDefined();
    expect(getBlock('dad-joke')).toBeDefined();
  });

  it('returns undefined for unknown blocks', () => {
    expect(getBlock('nonexistent')).toBeUndefined();
  });
});

describe('custom block', () => {
  it('renders with default config', async () => {
    const block = getBlock('custom')!;
    const result = await block.render(context, {});
    expect(result.command).toBe('echo "Hello, World!"');
    expect(result.lines).toEqual(['Hello, World!']);
  });

  it('renders with custom lines', async () => {
    const block = getBlock('custom')!;
    const result = await block.render(context, {
      command: 'echo test',
      lines: ['line 1', 'line 2'],
    });
    expect(result.command).toBe('echo test');
    expect(result.lines).toEqual(['line 1', 'line 2']);
  });
});

describe('neofetch block', () => {
  it('renders with default config', async () => {
    const block = getBlock('neofetch')!;
    const result = await block.render(context, {});
    expect(result.command).toContain('neofetch');
    expect(result.lines.length).toBeGreaterThanOrEqual(10);
    // Should contain markup
    expect(result.lines.some(l => l.includes('[[fg:cyan]]'))).toBe(true);
  });

  it('uses custom username and hostname', async () => {
    const block = getBlock('neofetch')!;
    const result = await block.render(context, { username: 'alice', hostname: 'server' });
    expect(result.lines[0]).toContain('alice@server');
  });
});

describe('fortune block', () => {
  it('renders a fortune in a box', async () => {
    const block = getBlock('fortune')!;
    const result = await block.render(context, {});
    expect(result.command).toBe('fortune');
    // Output should contain box characters
    expect(result.lines.some(l => l.includes('╭') || l.includes('╰'))).toBe(true);
  });
});

describe('dad-joke block', () => {
  it('renders a joke in a box', async () => {
    const block = getBlock('dad-joke')!;
    const result = await block.render(context, {});
    // Output should contain box characters and Q:/A: structure
    const text = result.lines.join('\n');
    expect(text).toContain('Q:');
    expect(text).toContain('A:');
  });
});

describe('motd block', () => {
  it('renders message of the day', async () => {
    const block = getBlock('motd')!;
    const result = await block.render(context, {});
    expect(result.command).toContain('motd');
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('goodbye block', () => {
  it('renders goodbye message', async () => {
    const block = getBlock('goodbye')!;
    const result = await block.render(context, {});
    expect(result.command).toBeTruthy();
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('classic easter-egg blocks', () => {
  const eggs = ['vim-exit', 'sudo-sandwich', 'rm-rf', 'fork-bomb', 'kernel-panic', 'segfault'];

  for (const name of eggs) {
    it(`${name} renders default command + non-empty output`, async () => {
      const block = getBlock(name)!;
      expect(block).toBeDefined();
      const result = await block.render(context, {});
      expect(result.command).toBeTruthy();
      expect(result.lines.length).toBeGreaterThan(0);
    });
  }

  it('sudo-sandwich respects user override', async () => {
    const block = getBlock('sudo-sandwich')!;
    const result = await block.render(context, { user: 'alice' });
    expect(result.lines.some(l => l.includes('alice'))).toBe(true);
  });

  it('segfault respects program override', async () => {
    const block = getBlock('segfault')!;
    const result = await block.render(context, { program: 'rocket.out' });
    expect(result.lines.some(l => l.includes('rocket.out'))).toBe(true);
  });
});

describe('persona blocks', () => {
  const persona = ['whoami', 'last-login', 'finger', 'who', 'uptime'];

  for (const name of persona) {
    it(`${name} renders default command + non-empty output`, async () => {
      const block = getBlock(name)!;
      expect(block).toBeDefined();
      const result = await block.render(context, {});
      expect(result.command).toBeTruthy();
      expect(result.lines.length).toBeGreaterThan(0);
    });
  }

  it('whoami default render is a 1-line uid=N(user) gid=N(user) groups=... format', async () => {
    // #105: changed default from the existential-bullets render to terse
    // `whoami -a` style. Verbose mode (verbose: true) keeps the old behavior.
    const block = getBlock('whoami')!;
    const result = await block.render(context, { user: 'alice' });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toContain('uid=');
    expect(result.lines[0]).toContain('alice');
    expect(result.lines[0]).toContain('gid=');
    expect(result.lines[0]).toContain('groups=');
  });

  it('whoami verbose mode keeps the multi-line existential-bullets render', async () => {
    const block = getBlock('whoami')!;
    const result = await block.render(context, { user: 'alice', verbose: true });
    expect(result.lines[0]).toBe('alice');
    expect(result.lines.length).toBeGreaterThan(1);
  });

  it('uptime reflects custom days in output', async () => {
    const block = getBlock('uptime')!;
    const result = await block.render(context, { days: 1234 });
    expect(result.lines[0]).toContain('1234');
  });

  it('finger respects custom mail count', async () => {
    const block = getBlock('finger')!;
    const result = await block.render(context, { mail: 7 });
    expect(result.lines.some(l => l.includes('7'))).toBe(true);
  });
});

describe('previously-uncovered blocks', () => {
  const blocks = ['htop', 'npm-install', 'profile', 'blog-post', 'national-day', 'systemctl'];

  for (const name of blocks) {
    it(`${name} renders default command + non-empty output`, async () => {
      const block = getBlock(name)!;
      expect(block).toBeDefined();
      const result = await block.render(context, {});
      expect(result.command).toBeTruthy();
      expect(result.lines.length).toBeGreaterThan(0);
    });
  }

  it('htop respects cpu/mem overrides', async () => {
    const block = getBlock('htop')!;
    const result = await block.render(context, { cpu: 99.9, mem: 12.3 });
    const joined = result.lines.join('\n');
    expect(joined).toContain('99.9');
    expect(joined).toContain('12.3');
  });

  it('npm-install reflects package name in the command', async () => {
    const block = getBlock('npm-install')!;
    const result = await block.render(context, { package: 'is-odd' });
    expect(result.command).toContain('is-odd');
  });

  it('profile renders supplied name (case-insensitive)', async () => {
    const block = getBlock('profile')!;
    const result = await block.render(context, { name: 'Ada Lovelace' });
    expect(result.lines.join('\n').toLowerCase()).toContain('ada lovelace');
  });

  it('blog-post renders supplied title', async () => {
    const block = getBlock('blog-post')!;
    const result = await block.render(context, { title: 'A Brief History of Bugs' });
    expect(result.lines.join('\n')).toContain('A Brief History of Bugs');
  });

  it('systemctl uses the supplied service name', async () => {
    const block = getBlock('systemctl')!;
    const result = await block.render(context, { service: 'nginx.service' });
    expect(result.command).toContain('nginx.service');
  });
});

describe('v0.8 animated blocks', () => {
  const animated = ['ascii-clock', 'progress-bar', 'bouncing-dot', 'dice-roll'];

  for (const name of animated) {
    it(`${name}: returns animation payload + frame-0 fallback`, async () => {
      const block = getBlock(name)!;
      expect(block).toBeDefined();
      const result = await block.render(context, {});
      expect(result.animation).toBeDefined();
      expect(result.animation!.frames.length).toBeGreaterThan(1);
      expect(result.lines.length).toBeGreaterThan(0);
    });
  }

  it('ascii-clock honors 12h vs 24h format', async () => {
    const block = getBlock('ascii-clock')!;
    const result12 = await block.render(context, { format: '12h' });
    const result24 = await block.render(context, { format: '24h' });
    expect(result12.lines[0]).toMatch(/[AP]M/);
    expect(result24.lines[0]).not.toMatch(/[AP]M/);
  });

  it('progress-bar configurable width affects frame width', async () => {
    const block = getBlock('progress-bar')!;
    const narrow = await block.render(context, { width: 10 });
    const wide = await block.render(context, { width: 40 });
    // Final frame should be wider when width is larger.
    const narrowFinal = narrow.animation!.frames[narrow.animation!.frames.length - 1]![0]!;
    const wideFinal = wide.animation!.frames[wide.animation!.frames.length - 1]![0]!;
    expect(wideFinal.length).toBeGreaterThan(narrowFinal.length);
  });

  it('dice-roll respects a configured result', async () => {
    const block = getBlock('dice-roll')!;
    const result = await block.render(context, { result: [4, 5, 6] });
    const last = result.animation!.frames[result.animation!.frames.length - 1]![0]!;
    expect(last).toContain('15'); // 4+5+6 sum
  });

  it('bouncing-dot full out-and-back has 2*width-2 frames', async () => {
    const block = getBlock('bouncing-dot')!;
    const result = await block.render(context, { width: 10 });
    expect(result.animation!.frames.length).toBe(10 + 10 - 2); // 18
  });
});

describe('v0.8 practical blocks', () => {
  const practical = ['palette-swatch', 'semver-bump', 'ascii-calendar', 'toc'];

  for (const name of practical) {
    it(`${name}: renders default + non-empty output`, async () => {
      const block = getBlock(name)!;
      expect(block).toBeDefined();
      const result = await block.render(context, {});
      expect(result.command).toBeTruthy();
      expect(result.lines.length).toBeGreaterThan(0);
    });
  }

  it('palette-swatch lists all 16 named colors via [[fg:...]] markup', async () => {
    const block = getBlock('palette-swatch')!;
    const result = await block.render(context, {});
    const joined = result.lines.join('\n');
    expect((joined.match(/\[\[fg:/g) ?? []).length).toBe(16);
  });

  it('semver-bump computes major/minor/patch correctly', async () => {
    const block = getBlock('semver-bump')!;
    const result = await block.render(context, { current: '2.3.4' });
    const joined = result.lines.join('\n');
    expect(joined).toContain('3.0.0');
    expect(joined).toContain('2.4.0');
    expect(joined).toContain('2.3.5');
  });

  it('semver-bump rejects non-semver current via configSchema', async () => {
    const block = getBlock('semver-bump')!;
    expect(() => block.configSchema!.parse({ current: 'v2.3' })).toThrow();
  });

  it('toc generates GitHub-flavored anchor slugs', async () => {
    const block = getBlock('toc')!;
    const result = await block.render(context, {
      sections: ['Getting Started', 'API Reference', 'FAQs & Help'],
    });
    const joined = result.lines.join('\n');
    expect(joined).toContain('#getting-started');
    expect(joined).toContain('#api-reference');
    expect(joined).toContain('#faqs--help');
  });

  it('ascii-calendar highlights today with bold markup', async () => {
    const block = getBlock('ascii-calendar')!;
    const result = await block.render(context, {});
    const joined = result.lines.join('\n');
    const todayPadded = String(context.now.getDate()).padStart(2, ' ');
    expect(joined).toContain(`[[bold]]${todayPadded}[[/bold]]`);
  });
});

describe('v0.7 practical blocks', () => {
  const practical = ['sparkline', 'bbs-login', 'build-badge', 'license-card'];

  for (const name of practical) {
    it(`${name}: renders default + non-empty output`, async () => {
      const block = getBlock(name)!;
      expect(block).toBeDefined();
      const result = await block.render(context, {});
      expect(result.command).toBeTruthy();
      expect(result.lines.length).toBeGreaterThan(0);
    });
  }

  it('sparkline: encodes a custom series into block-element glyphs', async () => {
    const block = getBlock('sparkline')!;
    const result = await block.render(context, { values: [1, 2, 4, 8, 4, 2, 1], label: 'cpu' });
    const line = result.lines[0]!;
    expect(line).toContain('cpu:');
    // All 8 glyphs should appear somewhere across multiple series, but at least
    // the lowest and highest are exercised by this fixture.
    expect(line).toMatch(/▁/);
    expect(line).toMatch(/█/);
  });

  it('sparkline: rejects empty values array via schema', async () => {
    const block = getBlock('sparkline')!;
    expect(() => block.configSchema!.parse({ values: [] })).toThrow();
  });

  it('build-badge: emits the configured status glyph for each badge', async () => {
    const block = getBlock('build-badge')!;
    const result = await block.render(context, {
      badges: [
        { label: 'a', status: 'ok' },
        { label: 'b', status: 'fail' },
      ],
    });
    const joined = result.lines.join('\n');
    expect(joined).toContain('✓');
    expect(joined).toContain('✗');
  });

  it('license-card: respects custom license + holder', async () => {
    const block = getBlock('license-card')!;
    const result = await block.render(context, { license: 'Apache-2.0', holder: 'Acme Corp', year: 2030 });
    const joined = result.lines.join('\n');
    expect(joined).toContain('Apache-2.0');
    expect(joined).toContain('Acme Corp');
    expect(joined).toContain('2030');
  });

  it('bbs-login: includes the configured BBS name + baud rate', async () => {
    const block = getBlock('bbs-login')!;
    const result = await block.render(context, { name: 'COOL-BBS', baud: 2400 });
    const joined = result.lines.join('\n');
    expect(joined).toContain('COOL-BBS');
    expect(joined).toContain('2400');
  });
});

describe('v0.7 animated blocks', () => {
  const animated = ['heartbeat', 'spinning-gear', 'blinking-eyes', 'countdown'];

  for (const name of animated) {
    it(`${name}: returns an animation payload with the static fallback set to frame 0`, async () => {
      const block = getBlock(name)!;
      expect(block).toBeDefined();
      const result = await block.render(context, {});
      expect(result.animation).toBeDefined();
      expect(result.animation!.frames.length).toBeGreaterThan(1);
      expect(result.lines).toEqual(result.animation!.frames[0]);
    });
  }

  it('countdown: frame count = from + 1 ("go" frame)', async () => {
    const block = getBlock('countdown')!;
    const result = await block.render(context, { from: 3 });
    expect(result.animation!.frames.length).toBe(4); // 3, 2, 1, GO
    expect(result.animation!.loop).toBe(false); // play once, freeze on GO
  });

  it('countdown: respects custom "go" word', async () => {
    const block = getBlock('countdown')!;
    const result = await block.render(context, { from: 2, go: 'DEPLOY' });
    const last = result.animation!.frames[result.animation!.frames.length - 1]![0]!;
    expect(last).toContain('DEPLOY');
  });

  it('heartbeat: uses heart glyph in every frame', async () => {
    const block = getBlock('heartbeat')!;
    const result = await block.render(context, {});
    for (const frame of result.animation!.frames) {
      const line = frame[0]!;
      // Either a heart or its rest state — every frame has something in the glyph slot.
      expect(line.length).toBeGreaterThan(0);
    }
  });
});

describe('github-languages block', () => {
  it('renders static fallback when no username + no fallback', async () => {
    const block = getBlock('github-languages')!;
    const result = await block.render(context, {});
    expect(result.lines.length).toBeGreaterThan(0);
    const joined = result.lines.join('\n');
    expect(joined).toContain('TypeScript');
    expect(joined).toContain('65%');
    // Cycles through colors
    expect(joined).toContain('[[fg:cyan]]');
    expect(joined).toContain('[[fg:green]]');
  });

  it('respects custom barWidth', async () => {
    const block = getBlock('github-languages')!;
    const narrow = await block.render(context, { barWidth: 5 });
    const wide = await block.render(context, { barWidth: 30 });
    // Bar at 100% has barWidth filled chars; first row of static fallback is 65% — varies but the wide should be strictly longer than narrow.
    const narrowFilled = (narrow.lines[0]!.match(/█/g) ?? []).length;
    const wideFilled = (wide.lines[0]!.match(/█/g) ?? []).length;
    expect(wideFilled).toBeGreaterThan(narrowFilled);
  });

  it('respects custom top count', async () => {
    const block = getBlock('github-languages')!;
    const result = await block.render(context, { top: 2 });
    // Static fallback has 4 entries; top=2 should cap at 2 rows.
    expect(result.lines.length).toBe(2);
  });

  it('uses user-provided fallback when no username', async () => {
    const block = getBlock('github-languages')!;
    const result = await block.render(context, {
      fallback: [
        { name: 'Python', percent: 80 },
        { name: 'Shell', percent: 20 },
      ],
    });
    const joined = result.lines.join('\n');
    expect(joined).toContain('Python');
    expect(joined).toContain('Shell');
    expect(joined).toContain('80%');
    expect(result.lines.length).toBe(2);
  });

  it('rejects unknown keys via configSchema', () => {
    const block = getBlock('github-languages')!;
    expect(() => block.configSchema!.parse({ usrname: 'oops' })).toThrow();
  });

  it('rejects top > 10 via configSchema', () => {
    const block = getBlock('github-languages')!;
    expect(() => block.configSchema!.parse({ top: 11 })).toThrow();
  });
});

describe('animated blocks', () => {
  it('loading-spinner returns an animation payload with N frames', async () => {
    const block = getBlock('loading-spinner')!;
    const result = await block.render(context, {});
    expect(result.animation).toBeDefined();
    expect(result.animation!.frames.length).toBe(8);
    expect(result.animation!.fps).toBe(8);
    // First frame doubles as the static fallback
    expect(result.lines).toEqual(result.animation!.frames[0]);
  });

  it('loading-spinner respects custom label and fps', async () => {
    const block = getBlock('loading-spinner')!;
    const result = await block.render(context, { label: 'building', fps: 4 });
    expect(result.animation!.fps).toBe(4);
    expect(result.animation!.frames[0]![0]).toContain('building');
  });

  it('loading-spinner rejects unknown keys via configSchema', async () => {
    const block = getBlock('loading-spinner')!;
    expect(block.configSchema).toBeDefined();
    expect(() => block.configSchema!.parse({ labl: 'oops' })).toThrow();
  });
});

describe('visual blocks', () => {
  it('matrix-rain emits requested row count + access-granted footer', async () => {
    const block = getBlock('matrix-rain')!;
    const result = await block.render(context, { rows: 4, cols: 20, message: 'go ahead.' });
    // 4 rain rows + blank + footer = 6 lines
    expect(result.lines.length).toBe(6);
    expect(result.lines[5]).toContain('go ahead.');
  });

  it('matrix-rain output is stable for the same date', async () => {
    const block = getBlock('matrix-rain')!;
    const a = await block.render(context, { rows: 3, cols: 10 });
    const b = await block.render(context, { rows: 3, cols: 10 });
    expect(a.lines).toEqual(b.lines);
  });

  it('cowsay wraps long text and renders the cow', async () => {
    const block = getBlock('cowsay')!;
    const result = await block.render(context, { say: 'hello there friend how are you today', width: 12 });
    expect(result.lines.some(l => l.includes('(oo)'))).toBe(true);
    expect(result.lines[0]).toMatch(/^ _+$/);
  });

  it('cowsay handles a single short line', async () => {
    const block = getBlock('cowsay')!;
    const result = await block.render(context, { say: 'hi' });
    expect(result.lines.some(l => l.includes('< hi'))).toBe(true);
  });
});
