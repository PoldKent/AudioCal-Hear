# Changelog

**English** | [Español](CHANGELOG.es.md)

## v1.4 — 2026-10-30

- Added 3-round optional music A/B preferences (bass, vocals, treble) and stored those separately from hearing thresholds.
- Added results warning when a trial finishes without a usable threshold, and a targeted retry for those bands only.
- Suppress hearing-threshold-based EQ unless at least 60% of bands have usable data; manual and music-preference settings remain available.
- Stopped manual EQ gain adjustments from resetting the music player.
- Limited the provisional ±6 dB car-range warning to the 7-band car preset.
- Reinforced comfortable-volume safety guidance. No acoustic calibration or diagnostic claims.

## v1.3 — 2026-10-30

- Added an adaptive hearing test: coarse steps of up to 6 dB followed by 1 dB fine steps, each held for 3 seconds.
- First-pass automatic audio lasts at most 42 seconds; optional verification adds at most 15 seconds, for **57 seconds per frequency and ear**.
- Switched the default to one pass and updated the duration calculations and test indicators.
- Timed-out tests are saved as undetermined rather than assigned an unmeasured threshold.
- Previously saved profiles remain compatible.

## v1.2 — 2026-10-30

- Added a duration estimate to setup that updates when users change the band layout, channel mode, number of passes, or custom frequencies.
- Added maximum playback-time calculations based on 41 digital levels × 3 seconds × total trial count.
- Added a remaining-time display during a test and a personalized estimate after at least two measured thresholds.
- Stored elapsed time per trial, preserving compatibility with older saved profiles.
- No changes to the tone generator or EQ estimation algorithm.

## v1.1 — 2026-10-30

- Increased each level's duration to 3 seconds; reduced the level by 1 dB per step and added the countdown display.

## v1.0 — 2026-10-30

- Introduced descending-tone subjective hearing test, local profiles, and suggested EQ gains.
- Added 7-band and 10-band presets based on project reference images, additional standard layouts and a custom preset.
- Added A/B comparison with a locally selected audio file and import/export support.
