import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'svg-terminal-cli-'));
const cli = fileURLToPath(new URL('../../cli.ts', import.meta.url));
const config = join(dir, 'terminal config.yml');
writeFileSync(config, 'blocks:\n  - block: custom\n    config:\n      lines: ["[[fg:cyan]]   [[/fg]]X"]\n');
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], { encoding: 'utf8' });
}

describe('CLI flag parsing', () => {
  it.each([
    ['generate', '--config', '--static'],
    ['generate', '--output'],
    ['cache', 'check', '--config'],
  ])('rejects a missing value: %s %s %s', (...args) => {
    const result = run(args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('requires a value');
  });

  it('honors quoted paths and preserves styled whitespace when minifying', () => {
    const output = join(dir, 'output with spaces.svg');
    const result = run(['generate', '--config', config, '--output', output, '--static', '--minify']);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(output, 'utf8')).toMatch(/<tspan fill="[^"]+"> {3}<\/tspan>/);
  });

  it('does not enable flags after the end-of-options marker', () => {
    const output = join(dir, 'animated.svg');
    const result = run(['generate', '--config', config, '--output', output, '--', '--static', '--no-cache']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).not.toContain('(static');
    expect(result.stdout).not.toContain('cache:off');
    expect(result.stderr).not.toContain('unknown flag');
    expect(readFileSync(output, 'utf8')).toContain('<animate');
  });

  it('continues warning about unknown flags', () => {
    const result = run(['generate', '--config', config, '--output', join(dir, 'warning.svg'), '--no-chache']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain('unknown flag "--no-chache"');
  });

  it('rejects conflicting cache modes', () => {
    const result = run(['generate', '--config', config, '--no-cache', '--cache-mode', 'frozen']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Conflicting cache flags');
  });
});
