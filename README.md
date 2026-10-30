# AudioCal Hear

**English** · [Español](README.es.md)

### Hear. Adjust. Enjoy.

**AudioCal Hear** is a free-to-use, mobile-friendly, browser-based audio personalization assistant. Explore your perceived hearing thresholds, compare musical preferences and generate **suggested EQ settings** for headphones, speakers and car audio — with no account or software installation required to open the website.

**[Launch AudioCal Hear](https://poldkent.github.io/AudioCal-Hear/)** · [Latest changes](CHANGELOG.md) · [Release notes](RELEASE_NOTES.md)

> **Public preview · v1.6 · October 2026.** The application is available for testing, not validated as a medical hearing test or objective acoustic calibration.

## What you can do

- **Guided listening:** an adaptive descending-tone test with 3 seconds at each digital level; a coarse search is followed by 1 dB steps near the perceived threshold.
- **Personalize with music:** compare A/B sound choices for bass, vocals and treble, then fine-tune each band manually.
- **Choose your equalizer:** your 7-band car EQ (64, 160, 400, 1,000, 2,500, 6,250, 15,625 Hz); your 10-band headphone EQ (30, 60, 120, 250, 500, 1k, 2k, 4k, 8k, 16k Hz); additional 5/7/10/15/31-band and custom presets.
- **Save multiple profiles:** keep device-specific settings locally and export/import backup files.
- **Use 8 languages:** English, Spanish, French, Portuguese, Italian, German, Simplified Chinese and Japanese.
- **Run on mobile:** phone audio is sent to the output selected in the phone's own settings, including compatible Bluetooth devices.

The adaptive test schedules at most **42 seconds of playback** for the first attempt on one ear/frequency and up to **15 additional seconds** for optional verification. These limits exclude pauses and manual repetitions. A threshold may remain *undetermined*; missing readings are not replaced with fabricated measurements.

## Quick start

1. Visit **https://poldkent.github.io/AudioCal-Hear/** on your phone in a modern browser.
2. Connect your headphones, speaker or car audio using the phone's Bluetooth/audio settings. If testing a car, remain **parked**.
3. Select your device, EQ preset and test mode. Set a **low, comfortable, fixed volume** in a quiet environment.
4. Respond when each test tone becomes inaudible. Never increase the volume to chase a tone.
5. Compare your own music, review the suggestions and **manually** enter the EQ values in your hardware or headphone app.

The app does not detect every Bluetooth model, control the phone's system-wide EQ or update external devices automatically. Suggested settings may not yield a noticeable or preferable improvement on every device.

## Hearing-safety and accuracy notice

**Never test at maximum volume.** Stop immediately if a sound is uncomfortable, painful or causes ringing. Keep sessions short and use an appropriate listening level; high sound exposure can harm hearing. The displayed **dBFS** values are digital amplitude levels, **not** acoustic decibels measured at your ear.

**AudioCal Hear is not a hearing test for diagnosis, a hearing aid, a medical device, or a substitute for an audiologist.** Its listening thresholds and EQ curves are approximate and depend on the ear, playback device, fit, background noise and volume. Consult a qualified professional if you have hearing concerns.

## Privacy

The current app runs as a static page with **no AudioCal Hear accounts, app analytics or application-controlled backend**. Profiles and EQ preferences are stored in this browser's local storage. Selected music is handled locally in the browser. You can export backups yourself; anyone with access to your browser/device or exported files may be able to see them. GitHub, as the hosting provider, may process technical access information under its own policies.

Read [Privacy notice](PRIVACY.md) · [Privacy notice in Spanish](PRIVACY.es.md).

## Intellectual property and legal status

**© 2026 PoldKent — All rights reserved, to the extent of rights lawfully held.**

**Free access to the official app does not mean open-source licensing.** This repository is public for transparency, learning about the product and review, but **no general license to copy, modify, redistribute, rehost or commercially exploit the project code, visual design or branding is granted**. Access to the official hosted app for personal, noncommercial use is permitted subject to applicable law and the published terms.

GitHub's Terms of Service independently permit viewing and forking public repositories within GitHub's service. No repository notice can cancel those rights or guarantee that public HTML cannot be copied. Third-party rights and mandatory legal exceptions remain unaffected.

AudioCal Hear is an independent project, **not affiliated with, sponsored by or endorsed by Soundcore, Anker or any audio-device manufacturer**. Brand and product names used to identify compatibility belong to their respective owners. No claim is made that the **AudioCal Hear** name is a registered trademark.

[Proprietary rights notice](LICENSE.md) · [Terms of use](TERMS.md) · [Terms in Spanish](TERMS.es.md) · [Contribution policy](CONTRIBUTING.md).

## Technical details

The project is a self-contained **HTML + CSS + JavaScript** app using the Web Audio API, with no runtime dependencies. It works as a static site on GitHub Pages; the standalone HTML can also be saved and opened offline, subject to browser support. The app is not an audiometer and does not measure sound-pressure levels.

- [Spanish documentation](README.es.md)
- [Release notes · English / Español](RELEASE_NOTES.md)
- [Code audit · English](AUDIT.md) / [Español](AUDIT.es.md)
- [Version history · English](CHANGELOG.md) / [Español](CHANGELOG.es.md)

**Project home:** https://github.com/PoldKent/AudioCal-Hear
