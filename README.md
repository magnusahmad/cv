# Magnus Ahmad — portfolio

A static, dependency-free CV site built around a horizontally scrolling career
chronology, with a jump-to overview and product tiles for selected work.
No build step, no framework, no runtime dependencies.

## Publish

1. Push this folder to a GitHub repository.
2. Settings → Pages → deploy from the root of the selected branch.
3. Keep `.nojekyll` in place (it stops Pages from reprocessing `assets/`).

## Files

```
index.html            all content + the inline city line-art SVGs
cv.html               print-first traditional CV (source of the PDF)
magnus-ahmad-cv.pdf   two-page A4 CV, generated from cv.html
tools/make-pdf.mjs    regenerates the PDF via the Chrome DevTools Protocol
assets/site.css       the whole design system
assets/site.js        scroll chronology, rail, view switching
brands/               logos used in the chapter chips and work tiles
media/                product demo clips played inside the venture tiles
magnus-ahmad.png      portrait (also the favicon)
og.png                social share image
```

## Editing content

The site opens on the Overview; picking any row drops you into the Timeline at
that chapter. The timeline is a continuously scrolling ribbon of 10 chapters — neighbours peek
in on either side and the width of one chapter is the `--pw` token in the CSS.
Each chapter is one `<article class="panel">` in `index.html`. The script reads
everything it needs from that element's data attributes, so adding, reordering
or removing a chapter needs no JavaScript changes. The Overview lists run
newest-first; the timeline runs oldest-first.

| attribute     | purpose                                                   |
| ------------- | --------------------------------------------------------- |
| `data-date`   | `YYYY-MM-DD`; drives the interpolated date readout         |
| `data-year`   | the outlined year watermark, and the rail tooltip          |
| `data-accent` | `r,g,b`; the accent glides between chapters as you scroll  |
| `data-city`   | which inline skyline SVG to fade in                        |
| `data-geo`    | `City\|coordinates` for the caption above the rail          |
| `data-place`  | the location chip in the header                            |
| `data-label`  | the chapter name in the rail tooltip                       |
| `data-glow`   | `x% y%` position of the ambient glow                       |

The overview rows and the header/hero buttons jump into the timeline via
`data-goto="<panel index>"`.

## Regenerating the PDF

```bash
python3 -m http.server 8899                        # serve the folder
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --remote-debugging-port=9222 about:blank &
node tools/make-pdf.mjs http://localhost:8899/cv.html magnus-ahmad-cv.pdf
```

Two gotchas that cost real time, both worth remembering if `cv.html` is edited:

- Chrome's `--print-to-pdf` **CLI ignores `@page { margin }`** and applies its own
  large defaults. `Page.printToPDF` over CDP takes the margins as parameters,
  which is why the generator drives the protocol rather than the flag.
- Chrome lays out the printed page at the **paper width in CSS px** (~680px for
  A4 with these margins), so a bare `@media (max-width: 800px)` block *also
  matches while printing*. That silently stacked every entry header onto two
  lines and pushed the CV to three pages. Responsive rules in `cv.html` are
  scoped `@media screen and (max-width: …)` for exactly this reason.

## Notes

- Type is Inter / JetBrains Mono / Instrument Serif from Google Fonts; everything
  else is self-hosted.
- Below 860px the timeline becomes a vertical stack and the rail sticks to the
  bottom — the same content, no separate mobile markup.
- International School of Manila is listed in the overview but has no timeline
  chapter; its overview row is `.ov-row.static`, so it doesn't jump anywhere.
- Logos in the chapter chips and the tile title bars are links to each site.
- The Blocksense, Agent Harbor and Intern tiles play `media/*.mp4` inline (muted,
  looped); the Memento tile is a CSS rebuild of the product's own "Student
  overview" dashboard, scaled to the tile with container-query units — it keeps
  its light palette rather than inheriting the site's dark tokens. It has no
  fixed height: everything inside is sized in `em` off a `cqw` base, so the box
  fits its content exactly at any tile width, and above 860px the base also
  clamps to `vh` so it never outgrows a short viewport.
- Intern and Memento carry a `.tile-foot` link out to their public demo.
  They carry `data-src` rather than `src`: an IntersectionObserver assigns the
  source and starts playback only once the tile scrolls into view, and pauses it
  again on the way out. Under `prefers-reduced-motion` they load paused with
  controls instead of autoplaying. Source clips are H.264 (no audio) and should
  stay small — `intern-demo.mov` was 7.6 MB of HEVC, re-encoded to 193 KB with:
  `ffmpeg -i in.mov -an -vf scale=1040:-2 -c:v libx264 -crf 30 -preset slow
  -pix_fmt yuv420p -movflags +faststart out.mp4`
- Phrases in the hero sentence are `.jump` buttons carrying `data-goto`, so they
  scroll the ribbon to the chapter they name.
- Unreferenced leftovers, safe to delete: `landmarks/`,
  `assets/index-CReap02t.css`, `brands/memento.png`, and the raw logo drops at
  the repo root (`affinidi-logo.png`, `oxford-logo.png`, `lbs-logo.png`) — each
  was recoloured/cropped for a dark background into `brands/`.
