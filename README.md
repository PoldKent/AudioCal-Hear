# AudioCal Hear

**EN** | [Español](README.es.md)

**AudioCal Hear** is a single-file, mobile-friendly web app for subjective hearing-threshold testing and personalized equalizer suggestions for headphones, speakers, and car audio systems.

**Version:** 1.2 · **App interface:** Spanish (for now) · **Stack:** HTML, CSS, vanilla JavaScript, Web Audio API · **No external libraries**.

> **Safety:** This is *not* a clinical hearing test or an objective acoustic calibration. Its results are approximate, subjective EQ suggestions. Begin at a low, comfortable volume. Do not raise the volume to chase hard-to-hear frequencies. Stop if you experience discomfort or ringing.

## Try it on your phone

1. Connect your headphones, speaker, or car stereo using your phone's **Bluetooth/audio settings**. The browser uses the phone's selected system output; it cannot reliably detect or change the Bluetooth device itself.
2. Open `index.html` in a modern mobile browser. If local-file restrictions interfere, use GitHub Pages over HTTPS (setup below).
3. Choose the equalizer preset (including the exact **7-band car stereo** and **10-band headphones** from the project reference photos), stereo or individual ears, and one or two passes.
4. Check the audio at a quiet, comfortable and unchanged phone volume, in a quiet environment. Keep the vehicle parked throughout the test.
5. Start the test. Each frequency plays at one digital level for **3 seconds** and then decreases by **1 dB**; tap the button when you can no longer hear it.
6. Review estimated settings in **Ajustes**, compare using your local audio file, and enter the suggested settings manually into the device's equalizer.

## Supported equalizer presets

| Preset | Center frequencies (Hz) |
| --- | --- |
| Car stereo (7 bands — project reference) | 64, 160, 400, 1000, 2500, 6250, 15625 |
| Headphones (10 bands — project reference) | 30, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| Common 7-band layout | 63, 160, 400, 1000, 2500, 6300, 16000 |
| ISO octave-center 10-band layout | 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| Additional options | 5, 15, 31 bands; custom frequencies |

The car stereo's gain range is **provisionally** configured to ±6 dB. The supplied photo confirms a +6 reading, but not the complete scale. Adjust the gain limits to match your equipment.

## Test duration: estimate and maximum

The sweep covers **41 levels**, from −28 to −68 dBFS, at **3 seconds per level**. A single tone can therefore take up to **123 seconds**, but ends sooner when you mark your threshold.

Before starting, the app shows:
- the number of trials derived from band count, ear/channel mode, and repetitions;
- an **illustrative** 30–45 seconds per tone range, not a prediction of your hearing;
- the maximum uninterrupted tone-playback time;
- an updated remaining-time estimate after enough actual samples have been recorded.

For both channels together and two passes:

| Preset | Trials | Illustrative duration | Maximum sweep |
| --- | ---: | --- | --- |
| 7-band car | 14 | 7–10 min 30 sec | 28 min 42 sec |
| 10-band headphones | 20 | 10–15 min | 41 min |

Pauses and manually repeated trials are not included.

## Data, audio and privacy

- Profiles are stored locally in the same browser's `localStorage`. Back them up or move them using JSON export/import.
- Your selected A/B comparison music file is processed in the browser, rather than uploaded to an AudioCal Hear server.
- The browser's dBFS values are **digital signal levels**, not calibrated acoustic dB SPL.
- EQ suggestions do not independently measure a loudspeaker's frequency response, room acoustics, or hearing loss.
- The app **does not automatically modify** the car stereo or headphone system EQ; settings must be copied over manually.
- If a frequency is not audible, avoid large compensating boosts and stop if the audio becomes uncomfortable or distorted.

## Publish with GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch `main`, folder `/(root)`, and select **Save**.
4. After GitHub reports that the site has been deployed, open the URL shown there on your phone.

This project is a static HTML file and requires no server build.

## Contributing and permissions

This repository is **public to view**. Public visibility does **not** grant the ability to push changes. Only collaborators with explicit write access can push. Everyone else can propose changes through issues or pull requests, which the maintainer can review and decide whether to merge. See [CONTRIBUTING.md](CONTRIBUTING.md).

No license has been added yet. Public access does not by itself grant an open-source license to redistribute or adapt the software.

## Files

- `index.html` — complete self-contained web app.
- `README.md` — English project instructions.
- `README.es.md` — Spanish project instructions.
- `CHANGELOG.md` / `CHANGELOG.es.md` — version history in both languages.
- `CONTRIBUTING.md` — contribution and access guidelines.
