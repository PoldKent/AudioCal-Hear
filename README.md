# AudioCal Hear

**English** · [Español](README.es.md)

### Hear. Adjust. Enjoy.

A free, experimental browser-based listening and EQ personalization tool for headphones, speakers and parked car audio. No account, installation or payment is required.

[**Open Hear 3**](https://poldkent.github.io/AudioCal-Hear/) · [Saved results](https://poldkent.github.io/AudioCal-Hear/hear3-library/) · [Edit a saved EQ](https://poldkent.github.io/AudioCal-Hear/hear3-eq-editor/) · [Support the project](SUPPORT.md#english)

[![Source and regression tests](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/source-tests.yml/badge.svg)](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/source-tests.yml) [![Browser UI regression](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/browser-ui.yml/badge.svg)](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/browser-ui.yml)

## How to use Hear 3

1. Select your equipment and real EQ frequencies: 4, 5, 7, 10, 15 or 31 bands, or 2–31 custom frequencies. Five bands are the default.
2. Set and explicitly confirm a low, comfortable, fixed physical volume. Never turn up the volume to chase an inaudible tone.
3. Listen to the optional sweep, then start each tone and respond: heard comfortably, not heard, or too loud. Stop playback at any time.
4. Review the experimental EQ. Correct a previous frequency without losing other responses, or edit the draft manually in 0.5 dB steps within category limits. Undo, redo or restore the original curve.
5. Copy values, export TXT/CSV/PNG or explicitly save the result. Enter supported values in your own equipment manually. Original observations, original EQ and manual changes remain separate.

## Current capabilities

| Area | Hear 3 |
|---|---|
| Listening | Optional 20-second sweep, user-initiated tones, selective retest and interruption |
| EQ | Bounded experimental suggestions, editable draft, original retained, exports |
| Data | Browser-local records, historical archive, explicit paired backup restore, scoped deletion |
| Privacy | Local image processing, no automatic uploads, no application backend or analytics |
| Interface | Responsive layout, system/light/dark themes, eight languages; some technical routes and internal errors remain partially localized |
| Offline | Optional browser cache; Hear 3 is not a standalone single HTML file |

[Current audit](AUDIT.md) · [Release evidence](docs/hear3/release-evidence-gate.json) · [Software status](docs/hear3/62-software-closure-and-release-gate.md)

## Safety and privacy

This experimental listening aid is not an audiometer, medical device, calibrated hearing test or substitute for an audiologist. Digital dBFS is not acoustic SPL. Stop immediately if sounds cause discomfort, pain or ringing. Never test at maximum volume. EQ is never applied automatically. Physical device equivalences and clinical validity are not established; `stableReleaseClaim:false` remains in force. Owner hardware acceptance is recorded in [issue #96](https://github.com/PoldKent/AudioCal-Hear/issues/96), not an independent measurement report.

Profiles and files remain local unless exported. Backups are not encrypted by the app. GitHub may process technical access information under its own policies. [Privacy](PRIVACY.md) · [Terms](TERMS.md).

## Development

Use Node.js 22, the CI baseline. Run `npm run build` and `npm run verify` from the root. The public entry is copied from `src/hear3-entry.html`; browser ES modules and shared CSS live in `src/hear3/`. The historical Hear 2 single-file bundle is built separately for rollback; old preview bookmarks redirect home. [Developer guide](DEV_GUIDE.md) · [Browser QA](BROWSER_QA.md) · [CI](https://github.com/PoldKent/AudioCal-Hear/actions).

## Support and contributions

The official app remains free. Voluntary contributions do not unlock features or priority. [USDC or BBTC on Ethereum (ERC-20): instructions and verification](SUPPORT.md#english). Report bugs or propose improvements in [GitHub Issues](https://github.com/PoldKent/AudioCal-Hear/issues) without sharing private records. [Contribution policy](CONTRIBUTING.md).

## Rights and history

© 2026 PoldKent — All rights reserved to the extent lawfully held. Public source visibility does not imply an open-source license. GitHub's public repository terms and mandatory legal exceptions remain unaffected. Independent project, not affiliated with or endorsed by manufacturers. [Rights notice](LICENSE.md) · [Terms](TERMS.md) · [Changelog](CHANGELOG.md) · [Historical release notes](https://github.com/PoldKent/AudioCal-Hear/releases) · [Previous README and historical features](https://github.com/PoldKent/AudioCal-Hear/blob/e5bdc69d8ee537e891dcc79de839c511931c0963/README.md).
