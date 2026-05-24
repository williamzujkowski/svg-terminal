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

  it('whoami emits the username on the first line', async () => {
    const block = getBlock('whoami')!;
    const result = await block.render(context, { user: 'alice' });
    expect(result.lines[0]).toBe('alice');
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
