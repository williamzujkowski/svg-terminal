<!-- Thanks for the contribution! A few prompts to make review faster: -->

## What changed

<!-- One-paragraph summary. What's the user-visible difference? Link to an issue if there is one. -->

## Why

<!-- The motivation in 1-3 sentences. -->

## Test plan

- [ ] `npm test` passes locally (current baseline: 464+)
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] Manually generated an SVG: `node dist/cli.js generate --config <file>` and eyeballed the result

## Output structure changed?

If this changes the generated SVG (new elements, animation timing, layout math, attribute order):

- [ ] Snapshot tests refreshed (`npm test -- -u`)
- [ ] Brief description of the visual delta in the PR body
- [ ] Sample SVG attached or linked
