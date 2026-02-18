# svg-terminal

Generate beautiful animated SVG terminals for GitHub READMEs and beyond.

- **Declarative config** — YAML/JSON, no code needed for basic use
- **Built-in themes** — Dracula, Nord, Monokai (more coming)
- **Plugin blocks** — Neofetch, fortune, custom text, and extensible
- **Zero-dependency SVG** — Self-contained output, works in GitHub's SVG sandbox
- **CLI + Library** — Use from command line or import as a module

## Quick Start

```bash
npx svg-terminal init          # Creates terminal.yml
npx svg-terminal generate      # Generates terminal.svg
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

## License

MIT
