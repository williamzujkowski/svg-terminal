# svg-terminal

Generate beautiful animated SVG terminals for GitHub READMEs and beyond.

- **Declarative config** — YAML/JSON, no code needed for basic use
- **Built-in themes** — Dracula, Nord, Monokai (more coming)
- **Plugin blocks** — 16 built-in blocks including live API data (weather, GitHub stats, quotes)
- **Zero-dependency SVG** — Self-contained output, works in GitHub's SVG sandbox
- **CLI + Library** — Use from command line or import as a module

## Quick Start

```bash
npx svg-terminal init                       # Creates terminal.yml
npx svg-terminal generate                   # Generates terminal.svg
npx svg-terminal generate --watch           # Rebuild on every save
```

## Configuration

Edit `terminal.yml`:

```yaml
theme: dracula

window:
  title: "dev@my-machine:~"

terminal:
  prompt: "dev@box:~$ "

blocks:
  - block: neofetch
    config:
      username: dev
      hostname: my-machine
      role: Full-Stack Developer
      languages: TypeScript, Rust, Go

  - block: fortune
    config:
      fortunes:
        - "The best code is no code at all."
        - "Talk is cheap. Show me the code."

  - block: custom
    config:
      command: echo "Hello!"
      lines:
        - "[[fg:green]]Welcome to my terminal![[/fg]]"
```

## Themes

| Theme | Description |
|-------|-------------|
| `dracula` | Dark purple/green theme (default) |
| `nord` | Arctic blue/frost palette |
| `monokai` | Classic warm dark theme |
| `amber` | Vintage amber CRT (pairs well with `effects.textGlow: true`) |
| `green-phosphor` | Classic green-on-black phosphor (pair with glow) |
| `cyberpunk` | Neon magenta/cyan on near-black |
| `solarized-dark` | Ethan Schoonover's solarized dark palette |
| `win95` | Authentic Windows 95 chrome — auto-switches `window.style: win95` |

Special value: `theme: random` rotates through all themes deterministically by day of year — gives you a different look every day without committing to one.

## Blocks

| Block | Description |
|-------|-------------|
| `neofetch` | System-info display with configurable fields |
| `fortune` | Random quote/fortune in ASCII box |
| `custom` | Arbitrary text with `[[fg:color]]` markup |
| `motd` | Welcome banner / message of the day |
| `dad-joke` | Q&A joke in a fancy ASCII box (daily rotation) |
| `htop` | Colorful process/resource monitor display |
| `profile` | Developer profile info card |
| `goodbye` | Farewell message with well-wishes |
| `npm-install` | Humorous npm dependency tree |
| `blog-post` | Blog post title in a box |
| `national-day` | Fun national day celebration |
| `systemctl` | Fake systemd service status |
| `weather` | Live weather from wttr.in (also embeds in MOTD) |
| `github-stats` | Live GitHub user stats (repos, followers) |
| `quote` | Random quote from dummyjson.com |
| `fun-fact` | Random fun fact from uselessfacts.jsph.pl |
| `vim-exit` | The eternal "how do I quit vim?" meme |
| `sudo-sandwich` | xkcd 149 callback |
| `rm-rf` | Dramatic fake `rm -rf /` with commentary |
| `fork-bomb` | Mock fork-bomb warning ("turn your laptop fan into a leaf blower") |
| `kernel-panic` | Friendly BSOD spoof in terminal text |
| `segfault` | Fake core dump with corrupted backtrace |
| `whoami` | Username + existential identity bullets |
| `last-login` | `last` output with awkward 3am login timestamps |
| `finger` | Faux finger(1) card with snarky plan lines |
| `who` | `who` listing with ghost users (debugger, coffee, sanity) |
| `uptime` | Ridiculous uptime ("up 632 days, that one incident") |
| `matrix-rain` | Single-frame Matrix rain screen with ACCESS GRANTED footer |
| `cowsay` | Speech bubble + iconic ASCII cow (with word-wrap) |
| `loading-spinner` | Braille spinner cycling at configurable fps |
| `heartbeat` | Pulsing heart — emotional hook for a project you love |
| `spinning-gear` | Rotating `\|/-\\` gear for DevOps/infra vibes |
| `blinking-eyes` | Kaomoji mascot that blinks every few seconds |
| `countdown` | T-minus N..0..GO! launch stinger (plays once, freezes on GO) |
| `sparkline` | ASCII sparkline (`▁▂▄▇▆▅▃▂`) from a numeric series |
| `bbs-login` | Retro 1980s BBS welcome banner — pairs with `amber` / `green-phosphor` |
| `build-badge` | Terminal-style project status card (tests / lint / coverage) |
| `license-card` | Boxed License / Copyright card |

### Dynamic API Blocks

Blocks marked with "Live" fetch data at build time from free, SFW APIs. They gracefully fall back to static content on failure.

```yaml
# Weather in MOTD banner
- block: motd
  config:
    title: "MY TERMINAL"
    weather:
      location: NYC       # City name or coordinates
      units: imperial     # imperial, metric, or both

# Standalone weather block
- block: weather
  config:
    location: "Los Angeles"
    units: metric
    compact: false

# GitHub profile stats
- block: github-stats
  config:
    username: your-github-username

# Random fun fact
- block: fun-fact
```

Set `fetchTimeout` at the top level to control API timeout (default: 10000ms):

```yaml
fetchTimeout: 15000  # 15 seconds — generous for slow APIs
```

### Accessibility

Every generated SVG carries `role="img"`, an `aria-label` summary of the first commands, plus a `<title>` and `<desc>` as its first children. The `<desc>` contains the full final-frame content (every command prefixed with the prompt, every output line with color markup stripped) so screen-reader users can read more than the 5-command summary.

Opt out if your terminal output is sensitive and you don't want it duplicated as plain text inside the SVG payload:

```yaml
accessibility:
  describe: false   # default true — emit <desc> with full content
```

### Caching API responses

Dynamic blocks cache their responses in `.svg-terminal-cache.json` next to your config file (24h TTL by default). Commit that file alongside the YAML and CI builds become deterministic — no upstream hits, no diff churn from quote-of-the-minute drift.

```yaml
# Top-level overrides
cacheTTL: 86400         # seconds (default 86400 = 24h)
cachePath: ".cache.json" # relative to the config file (must stay inside)
```

CLI control:

```bash
svg-terminal generate                       # use cache if fresh, fetch + write back when stale
svg-terminal generate --refresh-cache       # ignore cache entries, re-fetch everything
svg-terminal generate --frozen-cache        # serve only cached values, never fetch (CI offline)
svg-terminal generate --no-cache            # bypass cache entirely (don't read, don't write)
```

**Reproducibility note:** committed cache + a generous `cacheTTL` makes CI _reproducible_; pair with `--frozen-cache` to make it _truly offline_ (the build fails loudly if any block lacks a cached entry, rather than silently reaching for the network).

**Privacy note:** the cache file stores the raw API payloads. If a block fetches data you'd rather not commit (e.g. a private GitHub profile), either skip that block in versioned configs or add `.svg-terminal-cache.json` to `.gitignore`.

### Custom Blocks

```typescript
import { registerBlock, generate } from 'svg-terminal';

registerBlock({
  name: 'my-block',
  render(context, config) {
    return {
      command: 'my-command',
      lines: ['Output line 1', '[[fg:green]]Colored line[[/fg]]'],
    };
  },
});
```

## Programmatic API

```typescript
import { generate } from 'svg-terminal';

const svg = await generate({
  theme: 'nord',
  blocks: [
    { block: 'neofetch', config: { username: 'dev' } },
    { block: 'custom', config: { command: 'date', lines: ['2026-02-18'] } },
  ],
});
```

## GitHub Action

```yaml
- uses: williamzujkowski/svg-terminal@v1
  with:
    config: terminal.yml
    output: src/terminal.svg
    commit: true
```

For maximally reproducible CI, commit `.svg-terminal-cache.json` alongside `terminal.yml` and add an `args: --frozen-cache` step to the workflow — every build will serve cached payloads with zero network calls.

## Text Markup

Blocks support inline color markup:

```
[[fg:green]]green text[[/fg]]
[[fg:cyan]][[bold]]bold cyan[[/bold]][[/fg]]
[[dim]]dimmed text[[/dim]]
```

Available colors: `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `orange`, `purple`, `pink`, `comment`, plus `bright_*` variants.

## ASCII Boxes

The box generator supports multiple styles:

```typescript
import { createBox } from 'svg-terminal';

createBox({ style: 'rounded', width: 40, lines: ['Hello!'] });
// ╭──────────────────────────────────────╮
// │ Hello!                               │
// ╰──────────────────────────────────────╯
```

Styles: `double` (╔═╗), `rounded` (╭─╮), `single` (┌─┐), `heavy` (┏━┓), `dashed` (┌╌┐)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the local dev loop, the block/theme contribution recipes, and PR conventions.

## License

MIT
