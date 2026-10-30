# AudioCal Hear — Code audit (v1.6)

[Español](AUDIT.es.md) · **English**

## Scope

Reviewed the v1.5 single-file HTML/CSS/JavaScript application and tested the v1.6 build in simulated mobile Chromium. This is a code and browser-level review, **not** an acoustic measurement or a penetration test.

## Cleanup and refactoring

- Removed the duplicate `approxTimeRange()` function.
- Removed unused state/constants (`selectedSetup`, `testStep`, `MAX_FREQUENCY`, `TEST_DURATION`) and an unused EQ gain accumulator. Made `showCustom` a local derived value.
- Removed obsolete `#deviceType` references and the duplicate EQ slider `change` handler; the `input` handler remains.
- Removed 10 unused CSS selector groups from legacy layouts.
- Precomputed per-locale translation fragments instead of sorting translation keys for every rendered text node.
- Preserved the original profile storage keys, the adaptive 3-second tone test, the EQ algorithm and all original frequency presets.

## Eight languages

Spanish, English, French, Portuguese, Italian, German, Simplified Chinese and Japanese. Covers setup, navigation, profiles, testing, results, safety warnings, A/B comparison, dialogs and accessibility labels. The selector is in the app header; selected language is stored locally. Device/profile names entered by users are not translated. All translations live in `index.html`, requiring no libraries or network access.

## Verification

- Rendered and navigated the app in each of the eight languages at a 390px mobile viewport.
- Checked no unexpected horizontal overflow and no browser JavaScript exceptions in the exercised flows.
- Created profiles, edited EQ bands, checked A/B local-file selection and retained the music player's source when changing language.
- Exercised an adaptive-tone coarse stage, the fine stage, and saved a threshold in Chromium.

## Known limitations

- Not a clinical audiogram or calibrated speaker measurement; digital dBFS does not equal acoustic dB SPL.
- Bluetooth device selection and hardware EQ configuration still happen outside the browser.
- Native file pickers and some OS dialogs follow the phone's language, not the app selector.
- Translations (especially acoustics terminology) should receive native-speaker review.
- Real Android/iOS/Bluetooth hardware testing is still recommended.

**Hearing safety:** Keep playback at a low, comfortable and stable level. Never test at maximum volume or raise it to chase an inaudible tone.
