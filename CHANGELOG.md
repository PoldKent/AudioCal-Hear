# Changelog

**English** | [Español](CHANGELOG.es.md)

## v1.8.1 — 2026-10-30

- Validated imported and locally stored profiles, bounded measurement arrays and gain values, with a 2 MB backup import limit.
- Enabled bounded interpolation between observed frequencies in quick mode, while counting only actual measurements toward automatic EQ coverage.
- Added cascaded peaking-filter headroom estimation with fixed preamp budget during A/B comparisons and bypass.
- Restored Web Audio processing when resuming local music after changing pages; cleanly disconnect stopped tone nodes.
- Removed obsolete functions, counters and a stale timer reference. Added translations of new warning/estimate labels.
- Passed 12 headless-browser regression cases plus DSP/normalization and player lifecycle tests; physical acoustic testing remains outstanding.

## v1.8.0 — 2026-10-30

- Added configurable −24 to −84 dBFS digital testing range with −36 dBFS default, explicit safety confirmation near −24, and warnings at the lower end.
- Replaced automatic coarse/fine descent with explicit heard/not-heard answers, adaptive ~12 dB discovery, 1 dB refinement, and two confirmation tones (up to 60 seconds of playback per first-pass frequency).
- Preserved the “still audible at floor” outcome without automatically cutting EQ gain.
- Added 3-step guided preparation, optional temporary microphone relative-noise check, fast (up to 6 frequencies) and complete modes, separate-ear default for headphones and a non-clinical left/right digital threshold chart.
- Preserved 7- and 10-band photo EQs, standard/custom bands, local profile compatibility and eight-language support.
- Verified JavaScript syntax, viewport layout, multilingual preparation and simulated threshold/still-heard flows; no physical-acoustic validation claimed.

## v1.7.0 — 2026-10-30

- Added optional **Smart Tonal Balance** in the result screen: two music A/B comparisons per selected EQ band with reversed order and smaller verification step.
- Automatically apply **±2 dB** only for consistent choices, **±1 dB** for a single supported preference, and **0 dB** for conflicting/equal decisions. Cumulative cuts limited to −6 dB and boosts to +3 dB; repeated sessions required for large cuts.
- Preserve old threshold data and store balance adjustments plus simple decision history separately per device.
- At the end of the threshold test, ask whether the tone remained audible; a still-audible tone does **not** automatically reduce any band.
- Maintain fixed global playback headroom between comparisons; perceived loudness matching is not guaranteed.
- Verified responsive UI, audio filter update, and profile persistence in a simulated Chromium browser at mobile and desktop sizes; hardware/Bluetooth validation remains pending.

## v1.6.1 — 2026-10-30

- Repositioned the multilingual no-installation badge to its own left-aligned row on narrow mobile screens, including 9:21 portrait.
- Added flexible container sizing and two-column setup/EQ comparison layouts on larger desktops (4:3 to 21:9).
- Prevented large gaps between the music preview and optional EQ controls on ultrawide screens.
- Verified eight screen sizes and badge translations in eight locales with no horizontal document overflow.
- Left audio algorithms, stored profiles and frequency presets unchanged.

## v1.6 — 2026-10-30

- Added offline localization for Spanish, English, French, Portuguese, Italian, German, Simplified Chinese and Japanese, with a persistent in-app selector and browser-language detection.
- Translated setup, profiles, test screens, EQ editor, safety text, messages and accessible labels; user-created names are preserved.
- Removed duplicate time-estimation helper, unused variables/constants, obsolete CSS rules and redundant EQ slider handling.
- Maintained profile storage compatibility and did not change the audio calibration or EQ recommendation algorithms.
- Tested 8 locales on simulated mobile Chromium and verified the coarse/fine audio flow and EQ controls.

## v1.5 — 2026-10-30

- Replaced the form-heavy setup with tappable device and EQ cards, two-choice listening/verification modes and a live compact duration summary.
- Featured the active profile and moved backups and supported-frequency catalogs into collapsible panels.
- Added tap-to-select EQ bands and a compact slider/± editor that retains music playback and writes adjustments to the selected profile.
- Kept detailed numeric values and hearing-test metrics behind expandable panels to reduce clutter.
- Retained v1.4 profile storage compatibility and the existing adaptive hearing test.

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
