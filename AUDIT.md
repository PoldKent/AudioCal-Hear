# AudioCal Hear — Current repository audit

**English** · [Español](AUDIT.es.md) · 2026-11-26

Baseline: [published commit e5bdc69](https://github.com/PoldKent/AudioCal-Hear/commit/e5bdc69d8ee537e891dcc79de839c511931c0963). This source, documentation and simulated-browser review is not an independent security penetration test, WCAG certification or acoustic assessment.

| Area | Finding / action |
|---|---|
| Release | [Pages deployment](https://github.com/PoldKent/AudioCal-Hear/actions/runs/45869971878) succeeded; #105 and #106 merged; no open PRs at baseline check |
| Browsers | Desktop 21:9 (240 passed), desktop 4:3 and Android passed; iPhone passed at audit snapshot. [Matrix](https://github.com/PoldKent/AudioCal-Hear/actions/runs/45869972411) |
| Documentation | README and developer guide distinguish the modular Hear 3 site from the historical Hear 2 recovery bundle. Historical descriptions remain accessible. |
| Support | Bilingual voluntary support guide, GitHub funding metadata and localized Help links; deposit details copied exactly from [Stickers Sonoros](https://github.com/PoldKent/stickers-sonoros/blob/main/SUPPORT.md). No automatic payment or transfer. |
| Privacy | Scoped deletion, BFCache private-image cleanup, restore recovery marker and separate original/manual EQ records; no blanket storage clearing. |
| Offline | Static manifest and synchronized cache version; no caching of personal data or external support links. |
| Open work | Technical exam, library and saved EQ editor still partly localized; per-model control equivalences and channel synthesis lack sufficient evidence. No independent acoustic or accessibility certification. |

The support/documentation revision requires its own CI results. Follow [Actions](https://github.com/PoldKent/AudioCal-Hear/actions) and [issue #90](https://github.com/PoldKent/AudioCal-Hear/issues/90). Owner hardware acceptance is recorded in #96; `stableReleaseClaim:false` remains unchanged. No clinical accuracy, real SPL or universal hardware compatibility is inferred.

## Historical audit (30 October 2026)


**English** · [Español](AUDIT.es.md) · Audited 30 October 2026

## Scope

Reviewed the full v1.8.0 standalone HTML/CSS/JavaScript application, device presets, Web Audio playback, adaptive tone scheduler, EQ recommendations, file import/export, browser-local profiles and localization. This is a **static/code and simulated-browser audit**, **not** an external penetration test, medical validation, calibrated acoustics assessment or proof of Bluetooth hardware compatibility.

## Findings and corrections

| Priority | Finding | v1.8.1 action |
| --- | --- | --- |
| High | Imported JSON profiles could contain malformed `measures` and unexpectedly crash when opened | Normalize and bound imported/local profiles, measurements, values and history; reject invalid bands and cap backups at 2 MB (100 imported/200 resident profiles) |
| High | Interpolated EQ bands could be mistaken for measured evidence during a format change | Distinguish direct observations from derived bands; require at least 60% **actually measured** band coverage for automatic hearing-threshold compensation |
| Medium | Quick mode said untested bands were estimated while its interpolation path did not operate | Enable bounded, logarithmic interpolation only **between** tested frequencies; never extrapolate outside the measured range or across frequency gaps exceeding a 5× ratio |
| Medium | Preamp headroom was based on the largest slider rather than total overlapping EQ filters | Estimate the **cascaded** peaking-filter response with sampled frequency points and reserve 2 dB additional headroom; hold preamp budget fixed during A/B and bypass |
| Medium | Leaving and returning to Results could recreate the music player without its playback handler | Reattach playback processing when the player DOM element changes; avoid orphaned audio connections |
| Medium | Legacy and unused JavaScript remained after earlier redesigns | Remove two unused test helpers, obsolete tone counters and a stale trial-timer reference; clean oscillator/audio graph nodes on completion |
| Low | Newly introduced labels and upload warnings could remain untranslated | Add the new messages to all seven non-Spanish language dictionaries |

No major visual redesign, renamed profile storage key, new tracking service, changed hearing-threshold method or changed output preset frequencies.

## Verification

- **12/12 browser regression checks passed:** eight locales, mobile navigation and device creation, explicit yes/no tone threshold, import validation, 2 MB guard, EQ screen and seven screen dimensions (360×840 through 2560×1080)
- **Algorithm checks passed:** quick-mode measurements versus interpolated values, measured-only reliability gating for 31-band EQ, lower-bound safety defaults, preserved balance-proofs, and sampled cascaded-filter peaks (one 6 dB filter ≈6 dB; two overlapping filters >6 dB)
- **Audio lifecycle passed:** local WAV playback still works after navigating away from and back to Results
- **JS syntax passed** in Node; headless Chromium did not report script exceptions in exercised flows

## Remaining limitations and risks

- Acoustic SPL cannot be determined from browser dBFS. Real headphone/speaker distortion, Bluetooth routing, channel isolation, microphone quality and musical comfort require **physical hardware testing**.
- The EQ peak estimator samples frequency points and includes a guard margin; it is not a mathematical guarantee against clipping at arbitrary rates, codecs or unexpected source material.
- The current 60% observed-band rule is a conservative software heuristic, **not a medical or electroacoustic standard**.
- UI translations should be checked by native speakers, particularly technical terms.
- A complete independent security assessment has not been performed; privacy remains browser-local and exported backups are not encrypted.

**Safety:** Keep playback low and comfortable; never test at maximum volume, never increase volume merely to detect an inaudible tone, and test car audio only while parked. v1.8.1 remains a **public pre-release**.

**Links:** [Latest release](https://github.com/PoldKent/AudioCal-Hear/releases/tag/v1.8.1) · [Application](https://poldkent.github.io/AudioCal-Hear/) · [Pending real-hardware validation](https://github.com/PoldKent/AudioCal-Hear/issues/1)
