# AudioCal Hear — editable sources

The canonical implementation lives in `src/`; `index.html` is generated and published as a standalone, offline-capable application. Edit the sources first, run `npm run build` and commit source and generated HTML together.

## Files and responsibilities

- `index.template.html`: document shell and injection markers.
- `styles.css`: responsive UI.
- `translations.json`: seven language dictionaries plus Spanish source strings (eight languages).
- `js/01-core.js`: shared state, profiles, persistence, adaptive threshold engine.
- `js/02-setup.js`: device and equalizer setup.
- `js/03-hearing-test.js`: tone generation, test responses and previous-frequency navigation.
- `js/03b-frequency-sweep.js`: optional slow-edge preliminary sweep.
- `js/03c-personal-sound.js`: personalization state and feedback.
- `js/03d-inline-loudness.js`: optional loudness comparison during the test.
- `js/04-equalization.js`: threshold evidence, conservative EQ, export and profile results.
- `js/05-audio-player.js`: optional music player and DSP.
- `js/05b-eq-transfer.js`: manual transfer to external controls.
- `js/05c-loudness.js`: optional post-test loudness exercise.
- `js/05d-evidence.js`: audit and CSV.
- `js/06-interactions.js`: UI events and import/export.

These 12 source scripts are concatenated in order into one shared script scope by `tools/build.mjs`. They are not independent ES modules.

## Maintenance commands

```sh
npm run build
npm run verify
npm run test:browser
npm run beta
```

The CI verifies byte-identical generation and regression tests. The runtime has no npm dependencies, server-side user profile uploads or telemetry. Preserve historical stored profile formats and safety warnings. Music upload and A/B comparison remain optional and only after the EQ result; observations in dBFS must never be presented as physical dB SPL.

Historical v1.7–v1.9 releases and their downloadable assets remain available on GitHub Releases. Their six one-off publication workflows were retired after the integration of Hear 2.0 on `main`. See `docs/HEAR-V2-ROADMAP.md` and issue #26 for remaining real-device QA.
