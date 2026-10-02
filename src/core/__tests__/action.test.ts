import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

const action = load(readFileSync(new URL('../../../action.yml', import.meta.url), 'utf8')) as {
  runs: { steps: Array<{ id?: string; run?: string }> };
};
const script = action.runs.steps.find(step => step.id === 'generate')!.run!;

describe('composite Action generate step', () => {
  it.each(['true', 'false'])('passes strict=%s and optional flags as separate arguments', strict => {
    const dir = mkdtempSync(join(tmpdir(), 'svg-terminal-action-'));
    try {
      const output = join(dir, 'terminal output.svg');
      const argvPath = join(dir, 'argv.json');
      writeFileSync(join(dir, 'svg-terminal'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.writeFileSync(process.env.ARGV_PATH, JSON.stringify(args));
fs.writeFileSync(args[args.indexOf('--output') + 1], '<svg/>');
`, { mode: 0o755 });
      const result = spawnSync('bash', ['-c', script], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH}`,
          ARGV_PATH: argvPath,
          GITHUB_OUTPUT: join(dir, 'outputs'),
          INPUT_CONFIG: 'config with spaces.yml', INPUT_OUTPUT: output,
          INPUT_CACHE_MODE: 'frozen', INPUT_STATIC: 'true', INPUT_MINIFY: 'true', INPUT_STRICT: strict,
        },
      });
      expect(result.status, result.stderr).toBe(0);
      const args: string[] = JSON.parse(readFileSync(argvPath, 'utf8'));
      expect(args).toEqual([
        'generate', '--config', 'config with spaces.yml', '--output', output,
        '--frozen-cache', '--static', '--minify', ...(strict === 'true' ? ['--strict'] : []),
      ]);
      expect(readFileSync(join(dir, 'outputs'), 'utf8')).toContain('changed=false');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
