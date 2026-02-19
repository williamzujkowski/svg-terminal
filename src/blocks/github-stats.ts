/**
 * GitHub Stats block — fetches live user stats from the GitHub API.
 * No authentication required (60 requests/hour per IP).
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { fetchJson } from '../core/http.js';

/** GitHub user API response (subset). */
interface GitHubUser {
  public_repos: number;
  followers: number;
  following: number;
  public_gists: number;
  created_at: string;
  bio: string | null;
}

/** Format a number with K/M suffix for large values. */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** GitHub stats block definition. */
export const githubStatsBlock: Block = {
  name: 'github-stats',
  description: 'Display live GitHub user statistics',

  async render(context: BlockContext, config: Record<string, unknown>): Promise<BlockResult> {
    const username = (config['username'] as string) ?? '';
    const width = (config['width'] as number) ?? 58;
    const timeout = context.config.fetchTimeout;

    if (!username) {
      return {
        command: 'gh api users/???',
        lines: ['[[fg:yellow]]github-stats: no username configured[[/fg]]'],
        typing: 'fast',
        pause: 'short',
      };
    }

    const url = `https://api.github.com/users/${encodeURIComponent(username)}`;
    const data = await fetchJson<GitHubUser>(url, timeout);

    let lines: string[];
    if (data) {
      const since = new Date(data.created_at);
      const sinceStr = `${since.toLocaleString('en-US', { month: 'short' })} ${since.getFullYear()}`;

      lines = [
        '',
        `[[fg:cyan]]GITHUB: @${username}[[/fg]]`,
        `Repos: [[bold]]${formatCount(data.public_repos)}[[/bold]]    Followers: [[bold]]${formatCount(data.followers)}[[/bold]]`,
        `Following: ${formatCount(data.following)}    Gists: ${formatCount(data.public_gists)}`,
        `Member since: ${sinceStr}`,
        '',
      ];
    } else {
      lines = [
        '',
        `[[fg:yellow]]GitHub stats unavailable for @${username}[[/fg]]`,
        '',
      ];
    }

    const box = createDoubleBox(lines, width);
    return {
      command: (config['command'] as string) ?? `gh api users/${username} --jq '.public_repos,.followers'`,
      lines: box.split('\n'),
      typing: 'fast',
      pause: 'medium',
    };
  },
};
