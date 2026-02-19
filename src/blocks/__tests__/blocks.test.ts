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
