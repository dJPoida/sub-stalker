# Favicon Design Brief

This project uses a radar + ledger motif to represent subscription tracking and financial visibility in a compact app icon.

## Final image generator prompt

Use this prompt when generating candidate icon concepts:

```text
Design a modern, premium app icon for "Sub Stalker", a subscription tracking app.
Motif: combine a radar pulse and a ledger/card visual into one geometric symbol.
Style: bold, clean, minimal, no text, no mascot, no photorealism.
Composition: centered symbol, strong silhouette, optimized for 16x16 readability.
Palette: deep navy (#0d2242), brand blue (#1f6feb), accent cyan (#32a8ff), soft white highlights.
Lighting: subtle gloss/highlight, crisp contrast, no noisy textures.
Output: 1024x1024 PNG, square, rounded-rectangle container, transparent outside icon container.
```

## Style constraints

- Keep the icon geometric and recognizable at very small sizes.
- Avoid text and tiny decorative details.
- Preserve high contrast between foreground symbol and background container.
- Respect the app brand direction (blue/navy, clean dashboard product feel).

## Selection rubric

Use this rubric when selecting a final candidate:

1. Legibility at 16x16 and 32x32.
2. Distinct silhouette from common finance/tracker icons.
3. Visual balance of radar (tracking) and ledger (subscription/billing) cues.
4. Strong contrast in both light and dark browser contexts.
5. No visual clutter when converted to maskable icons.

## Source asset

- Canonical source PNG: `docs/branding/favicon-source.png`
- Generated deployable outputs: `public/*favicon*`, `public/apple-touch-icon.png`, `public/android-chrome-*.png`, `public/safari-pinned-tab.svg`, `public/site.webmanifest`.
