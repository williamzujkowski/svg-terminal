import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate, generateStatic, inspectCache, mergeConfig, setStrictBlockConfig } from '../index.js';
import { hashConfig } from '../core/cache.js';
import { registerBlock } from '../blocks/index.js';
import { BlockConfigError } from '../core/errors.js';
import type { Block } from '../types.js';

beforeAll(() => {
  // Default tests run with strict mode off.
  setStrictBlockConfig(false);
});

afterEach(() => {
  setStrictBlockConfig(false);
  vi.restoreAllMocks();
});

describe.each([['animated', generate], ['static', generateStatic]] as const)('%s block rendering', (_name, render) => {
  it('passes schema defaults and transformed values to the block', async () => {
    const blockRender = vi.fn((_ctx, cfg: Record<string, unknown>) => ({
      command: 'test', lines: [String(cfg['label'])],
    }));
    registerBlock({
      name: 'parsed-config-test',
      configSchema: z.object({ label: z.string().trim(), count: z.number().default(3) }).strict(),
      render: blockRender,
    });
    const input = { label: '  hello  ' };
    await render({ blocks: [{ block: 'parsed-config-test', config: input }] });
    expect(blockRender.mock.calls[0]?.[1]).toEqual({ label: 'hello', count: 3 });
    expect(input).toEqual({ label: '  hello  ' });
  });

  it('rejects a schema that produces a non-object before calling render', async () => {
    const blockRender = vi.fn(() => ({ command: 'test', lines: [] }));
    registerBlock({ name: 'non-object-schema-test', configSchema: z.object({}).transform(() => null), render: blockRender });
    await expect(render({ blocks: [{ block: 'non-object-schema-test' }] })).rejects.toBeInstanceOf(BlockConfigError);
    expect(blockRender).not.toHaveBeenCalled();
  });

  it('inspects the same cache key used by a block with schema defaults', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'svg-terminal-parsed-cache-'));
    try {
      registerBlock({
        name: 'parsed-cache-test', cacheable: true,
        configSchema: z.object({ label: z.string().default('default') }).strict(),
        async render(context, cfg) {
          const value = await context.useCache!(`parsed-cache-test:${hashConfig(cfg)}`, async () => 'cached');
          return { command: 'test', lines: [value] };
        },
      });
      const config = { blocks: [{ block: 'parsed-cache-test' }] };
      const configPath = join(dir, 'terminal.yml');
      await render(config, { configPath });
      expect(inspectCache(config, configPath).results[0]?.status).toBe('OK');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(['comment', 'red', 'brightRed', 'titleBarText', '#123abc'])('resolves entry color %s using the theme', async color => {
    const config = { blocks: [{ block: 'custom', color, config: { lines: ['COLOR_TEST'] } }] };
    const theme = mergeConfig(config).theme;
    const expected = color.startsWith('#') ? color : theme.colors[color as keyof typeof theme.colors];
    const svg = await render(config);
    expect(svg).toMatch(new RegExp(`<text[^>]*fill="${expected}"[^>]*>\\s*COLOR_TEST\\s*</text>`));
  });

  it('preserves block colors and lets entry colors override them', async () => {
    const theme = mergeConfig({ blocks: [{ block: 'custom' }] }).theme;
    const blocks = [{ block: 'custom', config: { color: 'red', lines: ['BLOCK_COLOR'] } }];
    expect(await render({ blocks })).toMatch(new RegExp(`<text[^>]*fill="${theme.colors.red}"[^>]*>\\s*BLOCK_COLOR\\s*</text>`));
    expect(await render({ blocks: [{ ...blocks[0]!, color: 'comment' }] })).toMatch(
      new RegExp(`<text[^>]*fill="${theme.colors.comment}"[^>]*>\\s*BLOCK_COLOR\\s*</text>`),
    );
  });
});

describe('generate() programmatic guards', () => {
  it('throws when blocks is empty (programmatic bypass of zod schema)', async () => {
    await expect(generate({ blocks: [] })).rejects.toThrow(/at least one block/i);
  });

  it('throws when blocks is missing entirely', async () => {
    await expect(generate({} as Parameters<typeof generate>[0])).rejects.toThrow(/at least one block/i);
  });
});

describe('per-block config validation (#35)', () => {
  describe('configSchema (strict zod)', () => {
    it('passes valid config through unchanged', async () => {
      const svg = await generate({
        blocks: [{ block: 'custom', config: { command: 'echo hi', lines: ['hi'] } }],
      });
      expect(svg).toContain('<svg');
    });

    it('throws BlockConfigError on unknown key in a schema-equipped block', async () => {
      await expect(generate({
        blocks: [{ block: 'neofetch', config: { usernme: 'dev' } }],
      })).rejects.toBeInstanceOf(BlockConfigError);
    });

    it('error names the block, the entry index, and the offending key', async () => {
      try {
        await generate({
          blocks: [
            { block: 'custom', config: {} },
            { block: 'neofetch', config: { usernme: 'dev' } },
          ],
        });
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BlockConfigError);
        const err = e as BlockConfigError;
        expect(err.blockName).toBe('neofetch');
        expect(err.entryIndex).toBe(1);
        expect(err.formatted).toContain('blocks[1]');
        expect(err.formatted).toContain('usernme');
      }
    });

    it('throws on a value of the wrong type', async () => {
      await expect(generate({
        blocks: [{ block: 'htop', config: { cpu: 'lots' } }],
      })).rejects.toBeInstanceOf(BlockConfigError);
    });

    it('throws on out-of-range value (htop cpu > 100)', async () => {
      await expect(generate({
        blocks: [{ block: 'htop', config: { cpu: 999 } }],
      })).rejects.toBeInstanceOf(BlockConfigError);
    });
  });

  describe('allowedKeys (legacy warn path)', () => {
    const legacyBlock: Block = {
      name: 'legacy-warn-test',
      allowedKeys: ['greeting'] as const,
      render(_ctx, cfg) {
        const greeting = (cfg['greeting'] as string) ?? 'hi';
        return { command: 'echo', lines: [greeting] };
      },
    };

    beforeAll(() => {
      registerBlock(legacyBlock);
    });

    it('warns on unknown key but still renders', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const svg = await generate({
        blocks: [{ block: 'legacy-warn-test', config: { greetng: 'hi' } }],
      });
      expect(svg).toContain('<svg');
      expect(spy).toHaveBeenCalled();
      const msg = spy.mock.calls.map(c => String(c[0])).join('\n');
      expect(msg).toContain('greetng');
      expect(msg).toContain('legacy-warn-test');
    });

    it('--strict promotes the warning to BlockConfigError', async () => {
      setStrictBlockConfig(true);
      await expect(generate({
        blocks: [{ block: 'legacy-warn-test', config: { greetng: 'hi' } }],
      })).rejects.toBeInstanceOf(BlockConfigError);
    });

    it('accepts the universal entry keys (command / color / typing / pause) inside config', async () => {
      // These four are entry-level overrides, but blocks like `custom` also
      // read `command` and `color` out of their own config. Don't false-alarm.
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await generate({
        blocks: [{ block: 'legacy-warn-test', config: { greeting: 'hello', command: 'echo' } }],
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('blocks without schema OR allowedKeys', () => {
    it('renders without validation noise', async () => {
      // Register a throwaway block with neither contract — typo silence is expected here.
      const opaque: Block = {
        name: 'opaque-test',
        render: () => ({ command: 'echo', lines: ['ok'] }),
      };
      registerBlock(opaque);

      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const svg = await generate({
        blocks: [{ block: 'opaque-test', config: { anyKeyAtAll: 'fine' } }],
      });
      expect(svg).toContain('<svg');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
