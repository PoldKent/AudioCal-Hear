# AudioCal Hear — development sources

**These files are the editable source.** The root `index.html` remains the independent, browser-ready, offline-capable application served by GitHub Pages. No runtime dependencies are introduced.

- `index.template.html` — HTML shell with three injection markers.
- `styles.css` — original responsive CSS.
- `translations.json` — seven translation dictionaries; Spanish text remains in the UI source as the reference language (eight languages total).
- `js/01-core.js` — shared state, presets, localization and profile normalization.
- `js/02-setup.js` — device and EQ configuration.
- `js/03-hearing-test.js` — guided listening, tone generation and responses.
- `js/04-equalization.js` — recommendations, visualizations and profile screens.
- `js/05-audio-player.js` — local music player, filters, clipping headroom.
- `js/05b-eq-transfer.js` — guided manual transfer to platform/device equalizers, exact/estimated mapping.
- `js/06-interactions.js` — event listeners, import/export and bootstrapping.

The six JS *source modules are intentionally concatenated in order within one shared closure* so the generated HTML behaves exactly like the prior monolith. They are **not independent ES modules**, because changing every cross-module binding at once would create unnecessary regression risk.

```sh
npm run build        # regenerate root index.html from source
npm run verify       # ensure generated output is committed and run unit tests
```

No `npm install` is needed. Edit the sources, regenerate the HTML and commit **both source and output**. A GitHub Actions check prevents drift.

**Privacy/security:** do not move hearing profiles off-device, introduce tracking, or alter the levels/algorithm without explicit review and new listening-safety tests. Source is visible but proprietary; see ../LICENSE.md.
