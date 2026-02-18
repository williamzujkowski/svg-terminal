/**
 * Neofetch block — system info display in terminal style.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

/** Neofetch-style system info block. */
export const neofetchBlock: Block = {
  name: 'neofetch',
  description: 'Display system-info style output like neofetch',

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const username = (config['username'] as string) ?? 'user';
    const hostname = (config['hostname'] as string) ?? 'terminal';
    const title = (config['title'] as string) ?? `${username}@${hostname}`;
    const os = (config['os'] as string) ?? 'TerminalOS v1.0';
    const shell = (config['shell'] as string) ?? 'bash 5.2';
    const uptime = (config['uptime'] as string) ?? 'a long time';
    const role = (config['role'] as string) ?? 'Developer';
    const location = (config['location'] as string) ?? 'localhost';
    const languages = (config['languages'] as string) ?? 'TypeScript, Python, Go';
    const editor = (config['editor'] as string) ?? 'neovim';
    const separator = '\u2500'.repeat(title.length);

    const command = (config['command'] as string) ?? `neofetch --ascii_distro ${hostname}`;

    const lines = [
      `[[fg:cyan]]${title}[[/fg]]`,
      `[[fg:cyan]]${separator}[[/fg]]`,
      `[[fg:cyan]]OS[[/fg]]:        ${os}`,
      `[[fg:cyan]]Shell[[/fg]]:     ${shell}`,
      `[[fg:cyan]]Uptime[[/fg]]:    ${uptime}`,
      `[[fg:cyan]]Role[[/fg]]:      ${role}`,
      `[[fg:cyan]]Location[[/fg]]:  ${location}`,
      `[[fg:cyan]]Languages[[/fg]]: ${languages}`,
      `[[fg:cyan]]Editor[[/fg]]:    ${editor}`,
      '',
      // Color palette row
      '[[fg:red]]\u25CF[[/fg]] [[fg:green]]\u25CF[[/fg]] [[fg:yellow]]\u25CF[[/fg]] [[fg:blue]]\u25CF[[/fg]] [[fg:magenta]]\u25CF[[/fg]] [[fg:cyan]]\u25CF[[/fg]] [[fg:white]]\u25CF[[/fg]] [[fg:orange]]\u25CF[[/fg]]',
    ];

    return { command, lines };
  },
};
