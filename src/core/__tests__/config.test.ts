import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, mergeConfig } from '../config.js';
import { ConfigError } from '../errors.js';
import { registerBuiltinBlocks } from '../../blocks/index.js';
import type { UserConfig } from '../../types.js';

beforeAll(() => {
  registerBuiltinBlocks();
});

describe('mergeConfig', () => {
  const minimal: UserConfig = {
    blocks: [],
  };

  it('uses defaults when no overrides provided', () => {
    const config = mergeConfig(minimal);
    expect(config.window.width).toBe(1000);
    expect(config.window.height).toBe(560);
    expect(config.text.fontSize).toBe(14);
    expect(config.maxDuration).toBe(90);
    expect(config.scrollDuration).toBe(100);
  });

  it('applies theme by name', () => {
    const config = mergeConfig({ ...minimal, theme: 'nord' });
    expect(config.theme.name).toBe('nord');
  });

  it('resolves a custom theme registered via registerTheme()', async () => {
    const { registerTheme } = await import('../../themes/index.js');
    const custom = { ...(await import('../../themes/nord.js')).nord, name: 'my-custom' };
    registerTheme(custom);
    const config = mergeConfig({ ...minimal, theme: 'my-custom' });
    expect(config.theme.name).toBe('my-custom');
  });

  it('reserves "random" — registerTheme({ name: "random" }) throws', async () => {
    const { registerTheme } = await import('../../themes/index.js');
    const fake = { ...(await import('../../themes/nord.js')).nord, name: 'random' };
    expect(() => registerTheme(fake)).toThrow(/reserved/);
  });

  it('defaults to dracula theme', () => {
    const config = mergeConfig(minimal);
    expect(config.theme.name).toBe('dracula');
  });

  it('overrides window dimensions', () => {
    const config = mergeConfig({ ...minimal, window: { width: 800, height: 600 } });
    expect(config.window.width).toBe(800);
    expect(config.window.height).toBe(600);
    // Non-overridden values use defaults
    expect(config.window.borderRadius).toBe(12);
  });

  it('overrides maxDuration', () => {
    const config = mergeConfig({ ...minimal, maxDuration: 120 });
    expect(config.maxDuration).toBe(120);
  });

  it('overrides scrollDuration', () => {
    const config = mergeConfig({ ...minimal, scrollDuration: 200 });
    expect(config.scrollDuration).toBe(200);
  });

  it('overrides effects', () => {
    const config = mergeConfig({ ...minimal, effects: { textGlow: true, scanlines: false } });
    expect(config.effects.scanlines).toBe(false);
    expect(config.effects.textGlow).toBe(true);
  });

  it('includes animation config with defaults', () => {
    const config = mergeConfig(minimal);
    expect(config.animation.cursorBlinkCycle).toBe(1000);
    expect(config.animation.charAppearDuration).toBe(10);
    expect(config.animation.outputLineStagger).toBe(50);
    expect(config.animation.commandOutputPause).toBe(300);
    expect(config.animation.defaultTypingDuration).toBe(2000);
  });

  it('overrides animation config', () => {
    const config = mergeConfig({
      ...minimal,
      animation: { cursorBlinkCycle: 500, outputLineStagger: 100 },
    });
    expect(config.animation.cursorBlinkCycle).toBe(500);
    expect(config.animation.outputLineStagger).toBe(100);
    expect(config.animation.charAppearDuration).toBe(10); // default preserved
  });

  it('includes chrome config with defaults', () => {
    const config = mergeConfig(minimal);
    expect(config.chrome.titleFontSize).toBe(13);
    expect(config.chrome.buttonRadius).toBe(6);
    expect(config.chrome.dimOpacity).toBe(0.6);
  });

  it('overrides chrome config', () => {
    const config = mergeConfig({
      ...minimal,
      chrome: { titleFontSize: 16, dimOpacity: 0.4 },
    });
    expect(config.chrome.titleFontSize).toBe(16);
    expect(config.chrome.dimOpacity).toBe(0.4);
    expect(config.chrome.buttonRadius).toBe(6); // default preserved
  });

  it('defaults window style to macos', () => {
    const config = mergeConfig(minimal);
    expect(config.window.style).toBe('macos');
  });

  it('overrides window style', () => {
    const config = mergeConfig({ ...minimal, window: { style: 'floating' } });
    expect(config.window.style).toBe('floating');
  });

  it('defaults autoHeight to false', () => {
    const config = mergeConfig(minimal);
    expect(config.window.autoHeight).toBe(false);
    expect(config.window.minHeight).toBe(300);
    expect(config.window.maxHeight).toBe(1200);
  });

  it('enables autoHeight with min/max overrides', () => {
    const config = mergeConfig({
      ...minimal,
      window: { autoHeight: true, minHeight: 400, maxHeight: 900 },
    });
    expect(config.window.autoHeight).toBe(true);
    expect(config.window.minHeight).toBe(400);
    expect(config.window.maxHeight).toBe(900);
  });

  it('defaults animation loop to true', () => {
    const config = mergeConfig(minimal);
    expect(config.animation.loop).toBe(true);
  });

  it('overrides animation loop to false', () => {
    const config = mergeConfig({ ...minimal, animation: { loop: false } });
    expect(config.animation.loop).toBe(false);
  });

  it('overrides animation loop to a number', () => {
    const config = mergeConfig({ ...minimal, animation: { loop: 3 } });
    expect(config.animation.loop).toBe(3);
  });
});

describe('loadConfig error paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-terminal-test-'));
  const write = (name: string, body: string): string => {
    const p = join(dir, name);
    writeFileSync(p, body, 'utf-8');
    return p;
  };

  it('raises ConfigError when the file is missing', async () => {
    await expect(loadConfig(join(dir, 'does-not-exist.yml'))).rejects.toBeInstanceOf(ConfigError);
  });

  it('formats YAML parse errors with file + line', async () => {
    const file = write('bad-yaml.yml', 'theme: dracula\nblocks:\n  - block: custom\n  : oops\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).formatted).toContain('YAML parse error');
      expect((e as ConfigError).formatted).toContain(file);
    }
  });

  it('formats zod errors as a per-issue list', async () => {
    const file = write('no-blocks.yml', 'theme: dracula\nblocks: []\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).formatted).toContain('Invalid config');
      expect((e as ConfigError).formatted).toContain('At least one block');
    }
  });

  it('suggests Levenshtein-close keys on top-level typo (winodw → window)', async () => {
    const file = write('typo-toplevel.yml', 'theme: dracula\nwinodw:\n  width: 800\nblocks:\n  - block: custom\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      const msg = (e as ConfigError).formatted;
      expect(msg).toContain('Unrecognized key');
      expect(msg).toMatch(/did you mean "window"/);
    }
  });

  it('suggests Levenshtein-close keys on nested typo (terminal.fontsize → fontSize)', async () => {
    const file = write('typo-nested.yml', 'theme: dracula\nterminal:\n  fontsize: 14\nblocks:\n  - block: custom\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      const msg = (e as ConfigError).formatted;
      expect(msg).toContain('Unrecognized key');
      expect(msg).toMatch(/did you mean "fontSize"/);
    }
  });

  it('does not suggest for keys that are far from every known key', async () => {
    const file = write('far-key.yml', 'theme: dracula\ntotallyMadeUp: 1\nblocks:\n  - block: custom\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      const msg = (e as ConfigError).formatted;
      expect(msg).toContain('Unrecognized key');
      // No hint at all when nothing is close enough.
      expect(msg).not.toMatch(/did you mean/);
    }
  });

  it('rejects unknown theme names with the available list', async () => {
    const file = write('bad-theme.yml', 'theme: solarizedDark\nblocks:\n  - block: custom\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).formatted).toContain('Unknown theme');
      expect((e as ConfigError).formatted).toContain('solarized-dark');
    }
  });

  it('accepts the special "random" theme name', async () => {
    const file = write('random-theme.yml', 'theme: random\nblocks:\n  - block: custom\n');
    await expect(loadConfig(file)).resolves.toBeDefined();
  });

  it('hints at { describe: false } when user passes accessibility: false', async () => {
    const file = write('a11y-bool.yml', 'accessibility: false\nblocks:\n  - block: custom\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).formatted).toContain('describe: false');
    }
  });

  it('rejects an inline theme using the reserved name "random"', async () => {
    const file = write('inline-random.yml',
      'theme:\n  name: random\n  colors:\n    text: "#000"\n' +
      'blocks:\n  - block: custom\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).formatted).toContain('reserved');
    }
  });

  it('rejects unknown block names with the index that failed', async () => {
    const file = write('bad-block.yml', 'blocks:\n  - block: custom\n  - block: cowsayy\n');
    try {
      await loadConfig(file);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).formatted).toContain('Unknown block "cowsayy"');
      expect((e as ConfigError).formatted).toContain('blocks[1]');
    }
  });
});
