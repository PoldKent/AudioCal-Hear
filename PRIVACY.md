# AudioCal Hear — Privacy Notice

**English** · [Español](PRIVACY.es.md) · Applies to the public-preview v1.6 as examined on 30 October 2026.

## Privacy at a glance

AudioCal Hear is presently a **static, client-side application**. Its source code does not contain an AudioCal Hear account service, app-owned analytics, tracking pixel, network requests for user profiles or an app-operated remote database. This statement describes the **current code**, not potential future versions or GitHub's independent hosting operations.

## Optional microphone check (v1.8)

Only if you expressly tap **Check relative background noise**, the browser requests microphone permission and briefly analyzes the audio waveform **in memory** to derive a relative noise indicator. The application does not store microphone recordings, upload microphone samples, or claim a calibrated acoustic dB SPL measurement. The microphone stream is stopped after the check. You may skip it and continue the test. Browser/operating-system permissions and device behavior remain outside this app's control.

## What is stored on your device

- Your device/profile names, selected equalizer frequencies, hearing-test selections and outcomes, EQ settings and music preferences are kept in the browser's **localStorage**.
- The app remembers your selected language in local browser storage.
- An audio file you voluntarily select for A/B comparison is played/processed **in the browser**. It is not uploaded to a server operated by AudioCal Hear by the current code.
- You may download a **JSON backup** containing your profile data. Treat it as private; it is not encrypted by the export function.

Some information about your hearing sensitivity may be personal or sensitive. **Anyone who can access your device, browser profile or exported backup could potentially view it.** Browser clearing, private/incognito windows, different browsers or devices may erase or isolate your profiles. To delete stored app profiles, use the in-app deletion/reset options as applicable or remove this website's local browser data. Exported files must be deleted separately.

## What GitHub Pages may process

The official website is served by **GitHub Pages**. GitHub may collect standard hosting/security information (such as requests, IP addresses and technical browser information) independently, in accordance with its own terms and privacy statement: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.

AudioCal Hear does not control GitHub's processing, your browser's sync features or data that you independently share through GitHub issues, messages or third-party services.

## No hidden medical data collection

The application does **not** perform a medical hearing examination, and it does not provide clinical interpretation. The locally stored results are approximate user-generated audio preference/testing data. The project is not an online medical record provider.

## Contact and changes

For a privacy question about the app, request a private contact channel through https://github.com/PoldKent/AudioCal-Hear. Avoid posting hearing data, JSON exports, private contact details or other sensitive information in public issues.

If future versions introduce analytics, accounts, remote storage or other third parties, this notice must be updated and users should be informed before those features are used.
