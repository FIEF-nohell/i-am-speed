# Brand brief (design-studio v5, run headless)

Module: `FIEF-nohell/claude-bootstrap` @ master, `modules/design-studio` v5. The module has no palette CLI. It defines a staged workflow plus `references/craft-standards.md`. Executed by hand in one pass; every question the interactive flow would ask was answered from PROJECT.md (see DECISIONS.md D5).

## Phase 1: brief

- Surface mode: **Operate** (the user completes a task: typing). Target: desktop web, physical keyboard.
- Unique mechanism: lessons teach one key and one finger at a time on the Austrian ISO QWERTZ layout, and show which finger owns which key.
- Obvious category default: neon-on-black "gamer" typing test, or a cheerful gamified kids app. Both rejected.
- Operating scene: a person at a desk, eyes on the text, hands on the keys, for minutes at a time. Calm beats spectacle.
- Personality axes: calm over loud, precise over playful, quiet confidence over hype. The meme name does the humour; the UI stays serious and quiet.
- Anti-goals: no gradients, no shadows, no mascots, no illustrations, no card piles, no streak guilt, no emoji, no second accent.

## Brand signature

**The caret.** One accent-coloured vertical bar. It is the logo's stem (the "i" of "i am speed"), the typing caret, the active-row marker and the focus mark. Blur the copy, remove the logo, and the single accent bar that glides along the line still says "this app".

## Palette

One accent per theme, muted text ramp, red reserved for errors. Source: `brand/palette.json`. `npm run brand` generates `src/styles/themes.css` from it. Contrast is asserted by a unit test (body text AA, dimmed untyped text >= 4.5:1 on the canvas, accent >= 4.5:1).

## Type

Geist (UI sans) and Geist Mono (typing text), SIL OFL, self-hosted woff2 through `next/font/local`.

## Shape

Radii: 0 for text surfaces, 6px for keycaps and inputs. No shadows. Dividers are 1px at low contrast, used sparingly.
