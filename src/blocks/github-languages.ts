/**
 * GitHub Languages block — fetches a user's public repos and renders the
 * top-N programming languages as horizontal percentage bars (like GitHub's
 * own "Most used languages" widget).
 * No authentication required (60 requests/hour per IP, unauthenticated).
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { fetchJson } from '../core/http.js';
import { hashConfig } from '../core/cache.js';

const githubLanguagesSchema = z.object({
  username: z.string().optional(),
  top: z.number().int().min(1).max(10).optional(),
  command: z.string().optional(),
  barWidth: z.number().int().min(5).max(40).optional(),
  fallback: z.array(z.object({
    name: z.string(),
    percent: z.number(),
  })).optional(),
}).strict();

/** GitHub repos API entry (subset — we only read `language`). */
interface GitHubRepo {
  language: string | null;
}

/** A computed language slice (post-aggregation). */
interface LanguageSlice {
  name: string;
  percent: number;
}

/** Colors cycled per row for visual variety. */
const ROW_COLORS = ['cyan', 'green', 'yellow', 'magenta', 'blue'] as const;

/** Static fallback used when no username + no user fallback is provided. */
const STATIC_FALLBACK: LanguageSlice[] = [
  { name: 'TypeScript', percent: 65 },
  { name: 'JavaScript', percent: 20 },
  { name: 'Rust', percent: 10 },
  { name: 'Go', percent: 5 },
];

/** Aggregate repo languages into top-N slices with percentages summing to ~100. */
function aggregate(repos: GitHubRepo[], top: number): LanguageSlice[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name, count]) => ({
      name,
      percent: Math.round((count / total) * 100),
    }));
  return sorted;
}

/** Format slices as markup lines with aligned bars + percentages. */
function renderSlices(slices: LanguageSlice[], barWidth: number): string[] {
  if (slices.length === 0) {
    return ['[[fg:yellow]]github-languages: no language data available[[/fg]]'];
  }
  const nameWidth = Math.max(...slices.map((s) => s.name.length));
  return slices.map((slice, i) => {
    const color = ROW_COLORS[i % ROW_COLORS.length];
    const filled = Math.round((slice.percent / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    const namePadded = slice.name.padEnd(nameWidth, ' ');
    const pctPadded = `${slice.percent}%`.padStart(4, ' ');
    return `[[fg:${color}]]${namePadded}[[/fg]]  [[fg:${color}]]${bar}[[/fg]] ${pctPadded}`;
  });
}

/** GitHub languages block definition. */
export const githubLanguagesBlock: Block = {
  name: 'github-languages',
  description: 'Top languages in a user\'s public repos, with percentage bars',
  configSchema: githubLanguagesSchema,
  cacheable: true,

  async render(context: BlockContext, config: Record<string, unknown>): Promise<BlockResult> {
    const username = (config['username'] as string | undefined) ?? '';
    const top = (config['top'] as number | undefined) ?? 5;
    const barWidth = (config['barWidth'] as number | undefined) ?? 20;
    const userFallback = config['fallback'] as LanguageSlice[] | undefined;
    const timeout = context.config.fetchTimeout;

    const fallbackSlices = (userFallback && userFallback.length > 0
      ? userFallback
      : STATIC_FALLBACK).slice(0, top);

    if (!username) {
      return {
        command: (config['command'] as string) ?? 'gh api users/???/repos --jq "[.[].language] | group_by(.) | ..."',
        lines: renderSlices(fallbackSlices, barWidth),
        typing: 'fast',
        pause: 'medium',
      };
    }

    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100`;
    const cacheKey = `github-languages:${hashConfig({ username, top })}`;
    const repos = context.useCache
      ? await context.useCache(cacheKey, () => fetchJson<GitHubRepo[]>(url, timeout))
      : await fetchJson<GitHubRepo[]>(url, timeout);

    let slices: LanguageSlice[];
    if (repos && Array.isArray(repos)) {
      const aggregated = aggregate(repos, top);
      slices = aggregated.length > 0 ? aggregated : fallbackSlices;
    } else {
      slices = fallbackSlices;
    }

    return {
      command: (config['command'] as string) ?? `gh api users/${username}/repos --jq '[.[].language] | group_by(.) | map({k: .[0], n: length})'`,
      lines: renderSlices(slices, barWidth),
      typing: 'fast',
      pause: 'medium',
    };
  },
};
