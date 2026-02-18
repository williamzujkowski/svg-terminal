/**
 * htop block — colorful process/resource display.
 */

import type { Block, BlockResult } from '../types.js';

interface Process {
  pid: string;
  user: string;
  cpu: string;
  mem: string;
  command: string;
  state?: string;
}

/** htop-style process display block. */
export const htopBlock: Block = {
  name: 'htop',
  description: 'Display an htop-style process and resource monitor',

  render(_context, config: Record<string, unknown>): BlockResult {
    const cpuPercent = (config['cpu'] as number) ?? 80.5;
    const memPercent = (config['mem'] as number) ?? 50.0;
    const processes = (config['processes'] as Process[]) ?? [
      { pid: '1337', user: 'dev', cpu: '99.9', mem: '5.0', command: 'coding --premium', state: 'R' },
      { pid: '2048', user: 'dev', cpu: '42.0', mem: '3.7', command: 'family --priority=max', state: 'S' },
      { pid: '4096', user: 'dev', cpu: '15.2', mem: '2.1', command: 'security-scanner', state: 'S' },
    ];

    const cpuBar = makeBar(cpuPercent);
    const memBar = makeBar(memPercent);

    const lines: string[] = [
      `  [[fg:cyan]]CPU[[/fg]][${colorBar(cpuBar, 'green')}  [[fg:white]]${cpuPercent.toFixed(1)}%[[/fg]]]   [[fg:yellow]]Tasks:[[/fg]] ${processes.length + 10}, [[fg:green]]${processes.length} running[[/fg]]`,
      `  [[fg:cyan]]Mem[[/fg]][${colorBar(memBar, 'blue')}  [[fg:white]]${memPercent.toFixed(1)}%[[/fg]]]   [[fg:yellow]]Load:[[/fg]] 0.42 0.37 0.31`,
      '',
      `  [[fg:cyan]]PID[[/fg]]  [[fg:cyan]]USER[[/fg]]     [[fg:cyan]]S[[/fg]] [[fg:cyan]]CPU%[[/fg]] [[fg:cyan]]MEM%[[/fg]]  [[fg:cyan]]Command[[/fg]]`,
    ];

    for (const proc of processes) {
      const state = proc.state ?? 'S';
      const stateColor = state === 'R' ? 'green' : 'yellow';
      lines.push(
        ` [[fg:white]]${proc.pid.padEnd(6)}[[/fg]] [[fg:green]]${proc.user.padEnd(8)}[[/fg]] [[fg:${stateColor}]]${state}[[/fg]] ${proc.cpu.padStart(5)} ${proc.mem.padStart(5)}  [[fg:white]]${proc.command}[[/fg]]`,
      );
    }

    return {
      command: (config['command'] as string) ?? 'htop --sort-key=PERCENT_CPU',
      lines,
      typing: 'slow',
      pause: 'long',
    };
  },
};

function makeBar(percent: number): string {
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function colorBar(bar: string, color: string): string {
  return `[[fg:${color}]]${bar}[[/fg]]`;
}
