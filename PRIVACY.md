# AudioCal Hear 3 — Privacy and local data

**English** · [Español](PRIVACY.es.md) · Reviewed 23 November 2026.

## Overview

Hear 3 is an **experimental** static audio-personalization web app hosted on GitHub Pages. Its main test requires no account, login, microphone or music file. The app source does not include an app-operated analytics service or a profile/response upload API. Requests made to GitHub for hosting are governed by GitHub's independent policies.

## What the browser stores, and when

- **Automatic in-progress recovery:** during the sweep and individual tones, Hear may maintain a checkpoint in your browser's local storage (falling back to tab-session storage when needed). This can include your declared device/EQ format, tone frequencies and digital levels, responses, recovery state, an immutable audit of retired answers and **“Too loud”** reports bound to verified tones. It allows a test to resume **without autoplay**. The checkpoint can exist before you choose to save a final EQ.
- **Optional saved results:** the local catalog adds a result/profile only after you select Save result and confirm. It may contain test history, EQ values, notes and later edits.
- **Preferences:** language, theme, device category and band layout can be remembered in the browser. Legacy loudness marks may remain in tab-session storage until cleared.
- **Optional photos and technical tools:** these work locally under the selected workflow. Do not share private photographs or diagnostics in public issues.
- **Offline access:** static resource caching is opt-in. It does **not** back up answers, photos or profiles.

Browser storage and exported backup files are not automatically encrypted. The checksum can catch certain accidental corruption but provides **neither cryptographic authentication nor confidentiality**.

## Exporting, retention and deletion

You can copy or export EQ values as TXT, CSV or PNG, and separately download backups through optional tools. Downloaded files cannot be deleted by the website and must be removed separately.

You may discard an incomplete test using the start-over option or inspect and delete known local keys through [Privacy and data](hear3-privacy/). The deletion UI previews its scope and requires confirmation. It does not claim to erase other devices, browsers, downloaded backups or hosting records. **Close other Hear tabs** before deleting to prevent another tab from writing data again.

Hear 2 legacy keys are preserved unless you explicitly select a deletion scope that includes them. Browser-site data removal can erase results that have not been backed up. Anyone with access to your device, browser storage or exported backup may be able to view personal hearing-response information.

## What Hear does NOT measure or transmit

Digital test tones measured in dBFS are **not acoustic dB SPL measurements**. Subjective answers and the resulting EQ are not clinical results or medical records. The app does not automatically configure third-party equalizers or control your device's physical volume. Legacy microphone features and music A/B workflows are not part of Hear 3's primary exam.

GitHub Pages may process hosting requests, IP addresses and technical data independently under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Hear's local deletion controls cannot remove those provider records.

## Contact

For privacy questions, request a private contact route via the [GitHub project](https://github.com/PoldKent/AudioCal-Hear). Never post personal hearing responses, photos, backup files or sensitive contact details in public issues.

Any future cloud sync, accounts, outside services or acoustic measurement features would require further privacy and security review before activation.
