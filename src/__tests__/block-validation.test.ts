import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { generate, setStrictBlockConfig } from '../index.js';
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
